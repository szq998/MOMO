const DB_PATH = "./assets/memory.db" //"shared://test.db"
const MEMORY_RESOURCE_PATH = "./assets/memory"

$app.theme = "auto"
$app.listen({
    // 在应用退出之前调用
    exit: function () {
        if (memoryDB) memoryDB.close()
        console.log("memoryDB closed")
    }
})

let MemoryDatabase = require("./scripts/memory_database.js")
let MemoryModel = require("./scripts/memory_model.js")
let MemoryView = require("./scripts/memory_view.js")
let MemoryListView = require("./scripts/memory_list_view.js")
let AddMemoryView = require("./scripts/add_memory_view.js")

function getDaysAgo(lts0) {
  let ts0 = new Date(new Date(lts0 * 1000).toLocaleDateString()).getTime()
  let ts1 = new Date(new Date().toLocaleDateString()).getTime()
  return parseInt((ts1 - ts0) / (1000 * 24 * 60 * 60))
}

function getContentDirById(id) {
    return MEMORY_RESOURCE_PATH + "/" + id
}

function getContentPathById(id) {
    let cDir = getContentDirById(id)
    return [
        cDir + "/q.jpg",
        cDir + "/a.jpg"
    ]
}

function getContentById(id) {
  let cPathes = getContentPathById(id)
  return cPathes.map(path => { return $image(path) })
}

function saveImageMemory(id, images) {
    let savePath = MEMORY_RESOURCE_PATH + "/" + id
    $file.mkdir(savePath)

    let pathes = getContentPathById(id)
    for (let i = 0; i < 2; ++i) {
        $file.write({
            path: pathes[i],
            data: images[i].jpg()
        })
    }
}

function getRememberOrForgetCallback(memoryModel, rOrF) {
    return () => {
        if (rOrF == "r") memoryModel.remeber()
        else if (rOrF == "f") memoryModel.forget()
        let currDesc = memoryModel.getCurrentDescription()
        $ui.title = currDesc ? currDesc : $ui.title
        let currId = memoryModel.getCurrentId()
        if (typeof currId == "undefined") return undefined
        else return {
          contentType: memoryModel.getCurrentContentType(),
          contents: getContentById(currId)
        }
    }
}

let memoryDB
if (!$file.exists(DB_PATH)) {
    memoryDB = MemoryDatabase.createMemoryDatabase(DB_PATH)
    $file.mkdir(MEMORY_RESOURCE_PATH)
    $ui.alert("首次运行，已创建数据库")
} else memoryDB = new MemoryDatabase(DB_PATH)

let mmCallBack = {
    finish: () => {
        $ui.pop()
        $ui.success("完成")
        memoryListView.refresh()
    }
}
let memoryModel = new MemoryModel(memoryDB, mmCallBack)

let mvCallBack = {
    remember: getRememberOrForgetCallback(memoryModel, "r"),
    forget: getRememberOrForgetCallback(memoryModel, "f"),
    ready: () => {
        $ui.title = memoryModel.getCurrentDescription()
        
        return {
          contentType: memoryModel.getCurrentContentType(),
          contents: getContentById(memoryModel.getCurrentId())
        }
    }
}
let memoryView = new MemoryView("memory_view", mvCallBack)

let mlvCallBack = {
    deleteById: id => {
        memoryDB.deleteById(id)
        // delete resource
        let cDir = getContentDirById(id)
        $file.delete(cDir);
    },
    changeDescriptionById: (id, newDesc) => {
        memoryDB.updateDescriptionById(id, newDesc)
    },
    changeContentById: (id, updateListData) => {
        let pathes = getContentPathById(id)
        let mem = memoryDB.getMemoryById(id)
        let currContent = {
            description: mem.description,
            qPath: pathes[0],
            aPath: pathes[1]
        }

        let doAfterModified = () => {
            let newMem = memoryDB.getMemoryById(id)
            updateListData(newMem.description, pathes[0], pathes[1])
        }

        addMemoryView.editMemory(id, currContent, doAfterModified)
    },
    getMemoryByPage: (pageNo, pageSize) => {
        let memory = []
        if (pageNo == 0) {
            memory = memory.concat(memoryDB.getNewlyAddedMemory())
        }
        memory = memory.concat(memoryDB.getMemory(pageNo, pageSize))

        return memory.map(m => {
            let pathes = getContentPathById(m.id)
            let lastDay = m.lastTime == 0 ? undefined : getDaysAgo(m.lastTime)

            let detail = ""
            if (m.lastTime == 0) detail += "新添加"
            else if (lastDay == 0) detail += "今天"
            else if (lastDay == 1) detail += "昨天"
            else detail += lastDay + "天前"

            detail += m.lastTime && !m.isRememberedLastTime ? " 忘记" : ""

            return {
                id: m.id,
                qPath: pathes[0],
                aPath: pathes[1],
                desc: m.description,
                degree: m.memoryDegree,
                detailedInfo: detail
            }
        })
    }
}
let memoryListView = new MemoryListView(
    "memory_list_view",
    mlvCallBack,
    (make, view) => {
        make.left.top.right.equalTo(view.super)
        make.bottom.equalTo(view.prev.top).offset(-15)
    }
)

let amvCallBack = {
    add: (description, qImage, aImage) => {
        let id = memoryDB.getNextId()
        saveImageMemory(id, [qImage, aImage])
        memoryDB.addMemory(0, description)
        memoryListView.refresh()
    },
    modify: (id, description, qImage, aImage) => {
        memoryDB.updateDescriptionById(id, description)
        saveImageMemory(id, [qImage, aImage])
    }
}
let addMemoryView = new AddMemoryView("add_memory_virw", amvCallBack)

function startMemory() {
    if (memoryDB.getCount() > 0) {
        // cache out
        let lastNum = $cache.get("using") ? $cache.get("using").lastNum : null
        $input.text({
            type: $kbType.number,
            text: lastNum,
            placeholder: "输入需要记忆的问题数量",
            handler: function (text) {
                let num = parseInt(text)
                if (num && num > 0) {
                    // cache in
                    $cache.set("using", {
                        lastNum: num
                    })
                    if (memoryModel.start(num) > 0)
                        $ui.push({
                            props: {
                                title: ""
                            },
                            views: [memoryView.toRender],
                            events: {
                                disappeared: () => {
                                    memoryListView.refresh()
                                },
                            }
                        })
                    // $ui.push
                    else $ui.warning("找不到记录")
                } // if
                else $ui.warning("输入错误")
            } // handler
        }) // $input.text
    } else $ui.warning("找不到记录，请添加")
} // start memory

function addMemory() {
    addMemoryView.appear()
}

function makeFirstPageButton(text, callBack) {
    return {
        type: "button",
        props: {
            title: text
        },
        events: {
            tapped: callBack
        } // events
    } // returned view
}

let buttonArea = {
    type: "stack",
    props: {
        id: "button_area",

        axis: $stackViewAxis.horizontal,
        spacing: 20,
        distribution: $stackViewDistribution.fillEqually,
        stack: {
            views: [
                makeFirstPageButton("开始记忆", startMemory),
                makeFirstPageButton("添加记录", addMemory)
            ] // views
        } // stack
    }, // props
    layout: (make, view) => {
        make.height.equalTo(50)
        make.bottom.left.right.inset(15)
    } // layout
} // buttonArea

$ui.render({
    props: {
        title: "默默记点啥",
        bgcolor: $color("secondarySurface")
    },
    views: [buttonArea, memoryListView.toRender, addMemoryView.toRender]
})