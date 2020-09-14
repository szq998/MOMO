const DB_PATH = "./assets/memory.db" //"shared://test.db"
const MEMORY_RESOURCE_PATH = "./assets/memory"

$app.theme = "auto"
$app.listen({
    // 在应用退出之前调用
    exit: function() {
        if (memoryDB) memoryDB.close()
        console.log("memoryDB closed")
    }
})

const ContentType = {
    image: 0,
    markdown: 1
}

let MemoryDatabase = require("./scripts/memory_database.js")
let MemoryModel = require("./scripts/memory_model.js")
let MemoryView = require("./scripts/memory_view.js")
let MemoryListView = require("./scripts/memory_list_view.js")
let MemorySettingView = require("./scripts/memory_setting_view.js")

function getDaysAgo(lts0) {
    let ts0 = new Date(new Date(lts0 * 1000).toLocaleDateString()).getTime()
    let ts1 = new Date(new Date().toLocaleDateString()).getTime()
    return parseInt((ts1 - ts0) / (1000 * 24 * 60 * 60))
}

function getContentDir(id) {
    return MEMORY_RESOURCE_PATH + "/" + id
}

function getContentPath(id, type) {
    let cDir = getContentDir(id)
    let sPath = cDir + "/s.png"
    if (type == ContentType.image) {
        return {
            qPath: cDir + "/q.jpg",
            aPath: cDir + "/a.jpg",
            sPath: sPath
        }
    } else if (type == ContentType.markdown) {
        return {
            qPath: cDir + "/q.md",
            aPath: cDir + "/a.md",
            sPath: sPath
        }
    } else console.error("Error: unsupported content type.")
}

function getContent(id, type) {
    let { qPath, aPath, sPath } = getContentPath(id, type)
    if (type == ContentType.image) {
        return {
            question: $image(qPath),
            answer: $image(aPath),
            snapshot: $image(sPath)
        }
    } else if (type == ContentType.markdown) {
        return {
            question: $file.read(qPath).string,
            answer: $file.read(aPath).string,
            snapshot: $image(sPath)
        }
    } else console.error("Error: unsupported content type.")
}

function saveContent(id, content) {
    let cDir = getContentDir(id)
    $file.mkdir(cDir)

    let { question, answer, snapshot } = content
    let qData, aData, sData
    sData = snapshot.png
    if (content.type == ContentType.image) {
        qData = question.jpg(1)
        aData = answer.jpg(1)
    } else if (content.type == ContentType.markdown) {
        qData = $data({ string: question })
        aData = $data({ string: answer })
    } else console.error("Error: unsupported content type.")

    let { qPath, aPath, sPath } = getContentPath(id, content.type)
    $file.write({
        data: qData,
        path: qPath
    })
    $file.write({
        data: aData,
        path: aPath
    })
    $file.write({
        data: sData,
        path: sPath
    })
}

function getRememberOrForgetCallback(memoryModel, rOrF) {
    return () => {
        if (rOrF == "r") memoryModel.remeber()
        else if (rOrF == "f") memoryModel.forget()

        let currDesc = memoryModel.getCurrentDescription()
        $ui.title = currDesc ? currDesc : $ui.title

        let currId = memoryModel.getCurrentId()
        let currType = memoryModel.getCurrentContentType()
        if (typeof currId == "undefined") return undefined
        else {
            let content = getContent(currId, currType)
            content.type = currType
            return content
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
        let currId = memoryModel.getCurrentId()
        let currType = memoryModel.getCurrentContentType()
        let content = getContent(currId, currType)

        content.type = currType
        return content
    }
}
let memoryView = new MemoryView("memory_view", mvCallBack)

let mlvCallBack = {
    deleteById: id => {
        memoryDB.deleteById(id)
        // delete resource
        let cDir = getContentDir(id)
        $file.delete(cDir)
    },
    changeDescriptionById: (id, newDesc) => {
        memoryDB.updateDescriptionById(id, newDesc)
    },
    changeContentById: (id, updateListDataWithContentInfo) => {
        let mem = memoryDB.getMemoryById(id)
        let { question, answer } = getContent(id, mem.type)
        let currContent = {
            type: mem.type,
            desc: mem.description,
            question: question,
            answer: answer
        }

        let doAfterModified = () => {
            let newMem = memoryDB.getMemoryById(id)
            let { qPath, aPath, sPath } = getContentPath(id, mem.type)
            let newInfo = {
                type: newMem.type,
                desc: newMem.description,
                qPath: qPath,
                aPath: aPath,
                sPath: sPath
            }
            updateListDataWithContentInfo(newInfo)
        }

        memorySettingView.editMemory(id, currContent, doAfterModified)
    },
    getMemoryByPage: (pageNo, pageSize) => {
        let memory = []
        if (pageNo == 0) {
            memory = memory.concat(memoryDB.getNewlyAddedMemory())
        }
        memory = memory.concat(memoryDB.getMemory(pageNo, pageSize))

        return memory.map(m => {
            let { qPath, aPath, sPath } = getContentPath(m.id, m.type)
            let lastDay = m.time == 0 ? undefined : getDaysAgo(m.time)

            let detail = ""
            if (m.time == 0) detail += "新添加"
            else if (lastDay == 0) detail += "今天"
            else if (lastDay == 1) detail += "昨天"
            else detail += lastDay + "天前"
            detail += m.time && !m.remembered ? " 忘记" : ""

            let contentInfo = {
                type: m.type,
                desc: m.description,
                qPath: qPath,
                aPath: aPath,
                sPath
            }
            return {
                id: m.id,
                contentInfo: contentInfo,
                degree: m.degree,
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

let msvCallBack = {
    add: content => {
        let id = memoryDB.getNextId()
        saveContent(id, content)
        memoryDB.addMemory(content.type, content.desc)
        memoryListView.refresh()
    },
    modify: (id, content) => {
        memoryDB.updateDescriptionById(id, content.desc)
        memoryDB.updateContentTypeById(id, content.type)

        saveContent(id, content)
    }
}
let memorySettingView = new MemorySettingView(
    "memory_setting_view",
    msvCallBack
)

function startMemory() {
    if (memoryDB.getCount() > 0) {
        // cache out
        let lastNum = $cache.get("using") ? $cache.get("using").lastNum : null
        $input.text({
            type: $kbType.number,
            text: lastNum,
            placeholder: "输入需要记忆的问题数量",
            handler: function(text) {
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
                                }
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
    memorySettingView.appear()
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
        bgcolor: $color("#F2F1F6", "primarySurface")
    },
    views: [buttonArea, memoryListView.toRender, memorySettingView.toRender]
})