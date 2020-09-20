const SNAPSHOT_WIDTH = 80
const SNAPSHOT_INSET = 5
const CONTENT_HEIGHT_WIDTH_RATIO = 2 / 3

const ContentType = {
    image: 0,
    markdown: 1
}

class MemoryListView {
    constructor(id, callBack, layout) {
        this.id = id
        this.callBack = callBack
        this.nextPage
        this.data = []
        this.pageSize
        this.estimatedRowHeight =
            SNAPSHOT_WIDTH / CONTENT_HEIGHT_WIDTH_RATIO + 2 * SNAPSHOT_INSET

        this.headerId = "header_of_" + this.id
        this.footerId = "footer_of_" + this.id

        this.toRender = {
            type: "list",
            props: {
                id: this.id,
                style: 2,
                autoRowHeight: true,
                estimatedRowHeight: this.estimatedRowHeight,
                data: this.data,
                menu: this.makeMenu(),
                header: this.makeHeader(),
                footer: this.makeFooter(),
                template: this.makeTemplate(),
                actions: this.makeActions() // actions
            }, // props
            events: {
                ready: sender => {
                    sender.relayout()

                    let superSize = sender.super.size
                    let biggerSpan =
                        superSize.height > superSize.width
                            ? superSize.height
                            : superSize.width
                    biggerSpan = biggerSpan * $device.info.screen.scale
                    this.pageSize =
                        parseInt(biggerSpan / this.estimatedRowHeight) + 1
                    console.log("page size is " + this.pageSize)

                    this.nextPage = 0
                    this.data = this.getNextPageData()
                    sender.data = this.data
                },
                pulled: sender => {
                    this.refreshMemoryList()
                },
                didReachBottom: sender => {
                    this.bottomReached(sender)
                }, // didReachBottom
                didSelect: (sender, indexPath, data) => {
                    this.quickLook(
                        data.contentInfo.type,
                        data.contentInfo.qPath
                    )
                } // didSelected
            }, // events
            layout: layout
        } // toRender
    } // constructor

    makeMenu() {
        return {
            //title: "Context Menu",
            items: [
                {
                    title: "编辑",
                    symbol: "pencil.and.ellipsis.rectangle",
                    inline: true,
                    items: [
                        {
                            title: "更改描述",
                            handler: (sender, indexPath, data) => {
                                this.changeDescription(sender, indexPath, data)
                            }
                        },
                        {
                            title: "更改类别",
                            handler: (sender, indexPath, data) => {
                                this.changeCategory(sender, indexPath, data)
                            } // handler
                        },
                        {
                            title: "更改内容",
                            handler: (sender, indexPath, data) => {
                                this.changeContent(sender, indexPath, data)
                            } // handler
                        }
                    ]
                },
                {
                    title: "查看答案",
                    symbol: "lock.open",
                    destructive: true,
                    handler: (sender, indexPath, data) => {
                        this.quickLook(
                            data.contentInfo.type,
                            data.contentInfo.aPath
                        )
                    }
                }
            ] // items
        } // menu
    }

    makeHeader() {
        return {
            type: "label",
            props: {
                id: this.headerId,
                height: 20,
                text: "所有记录",
                textColor: $color("#AAAAAA"),
                align: $align.center,
                font: $font(12)
            }
        }
    }

    makeFooter() {
        return {
            type: "label",
            props: {
                id: this.footerId,
                height: 20,
                text: "加载中...",
                textColor: $color("#AAAAAA"),
                align: $align.center,
                font: $font(12),
                hidden: true
            }
        }
    }

    makeActions() {
        return [
            {
                title: "删除",
                color: $color("red"),
                handler: (sender, indexPath) => {
                    $ui.menu({
                        items: ["确认删除"],
                        handler: (title, idx) => {
                            // let deleted = this.data.splice(indexPath.row, 1)[0]
                            // sender.data = this.data
                            let id = sender.data[indexPath.row].id
                            sender.delete(indexPath)
                            this.callBack.deleteById(id)
                        }
                    }) // $ui.menu
                } // handler
            }
        ]
    }
 
    makeTemplate(){
        return {
            props: { bgcolor: $color("secondarySurface") },
            views: [
                {
                    type: "image",
                    props: {
                        id: "snapshot",
                        cornerRadius: 5,
                        borderWidth: 1,
                        borderColor: $color("lightGray", "darkGray")
                    },
                    layout: (make, view) => {
                        make.width.equalTo(SNAPSHOT_WIDTH)
                        make.height
                            .equalTo(view.width)
                            .multipliedBy(CONTENT_HEIGHT_WIDTH_RATIO)

                        make.top.left.bottom.inset(SNAPSHOT_INSET)
                    }
                },
                {
                    type: "label",
                    props: {
                        id: "memory_desc",
                        font: $font("bold", 18),

                        textColor: $color("primaryText")
                    },
                    layout: (make, view) => {
                        make.leading.equalTo(view.prev.trailing).offset(8)
                        make.top.equalTo(view.prev).offset(3)
                    }
                },
                {
                    type: "view",
                    props: {
                        id: "degree_indicator",
                        circular: true
                    },
                    layout: (make, view) => {
                        make.size.equalTo($size(10, 10))
                        make.leading.equalTo(view.prev)
                        make.bottom.equalTo(view.prev.prev).offset(-10)
                    }
                },
                {
                    type: "label",
                    props: {
                        id: "detailed_info",
                        font: $font(14),
                        // textColor: $color("darkGray")
                        textColor: $color("secondaryText")
                    },
                    layout: (make, view) => {
                        make.leading.equalTo(view.prev.trailing).offset(4)
                        make.centerY.equalTo(view.prev)
                    }
                }
            ]
        }
    }

    // callBacks
    bottomReached(sender) {
        $(this.footerId).hidden = false
        let newData = this.getNextPageData()
        this.data = this.data.concat(newData)
        $delay(0.5, () => {
            $(this.footerId).hidden = true
            sender.endFetchingMore()
            sender.data = this.data
        })
    }

    async changeDescription(sender, indexPath, data) {
        let desc = await this.callBack.inputDescription(data.contentInfo.desc)
        if (desc) {
            let newData = data
            newData.contentInfo.desc = desc
            newData.memory_desc.text = desc
            this.data[indexPath.row] = newData
            this.callBack.changeDescriptionById(data.id, desc)
            sender.delete(indexPath)
            sender.insert({
                indexPath: indexPath,
                value: newData
            })
        }
    }

    async changeCategory(sender, indexPath, data) {
        let oldCtgy = data.contentInfo.category
        let allCtgy = this.callBack.getAllCategories()
        let index = allCtgy.indexOf(oldCtgy)
        allCtgy.unshift(allCtgy.splice(index, 1)[0])
        allCtgy.push("新增类别")

        let selectedIndex = 0
        await $picker.data({
            props: { items: [allCtgy] },
            events: {
                changed: sender => {
                    selectedIndex = sender.selectedRows[0]
                }
            }
        })

        // category (==0) not changed or undefined
        if (!selectedIndex) return

        if (selectedIndex == allCtgy.length - 1) {
            // add new category
            let newCtgy = await this.callBack.inputCategory()
            console.log("new")
            if (newCtgy) {
                if (!this.callBack.addCategory(newCtgy)) {
                    $ui.warning("添加新类别失败，可能与已有类别名重复")
                    return
                } else {
                    $ui.success("修改成功")
                    this.callBack.changeCategoryById(data.id, newCtgy)
                    this.callBack.reloadCategory()
                    // this.callBack.switchToCategory(newCtgy)
                }
            }
        } else {
            let targetCtgy = allCtgy[selectedIndex]
            // change to target category
            this.callBack.changeCategoryById(data.id, targetCtgy)
        }
        let currListCtgy = this.callBack.getCurrentCategory()
        if (currListCtgy) sender.delete(indexPath)

    }

    changeContent(sender, indexPath, data) {
        this.callBack.changeContentById(data.id).then( newContentInfo =>{
            if (data.contentInfo.category == newContentInfo.category) {
                // category not changed
                data.contentInfo = newContentInfo
                data.memory_desc.text = newContentInfo.desc
                data.snapshot.src = newContentInfo.sPath

                this.data[indexPath.row] = data
                sender.data = this.data
            } else {
                // category also changed
                let currCtgy = this.callBack.getCurrentCategory()
                if (currCtgy!= null) sender.delete(indexPath)
                this.callBack.reloadCategory()
            }
        }) // Promise.then
    } // changeContent

    categoryChanged() {
        this.nextPage = 0
        this.data = this.getNextPageData()

        $(this.id).data = this.data
    }

    categoryRenamed(oldName, newName) {
        if (this.callBack.getCurrentCategory() == oldName) {
            for (const i in this.data) {
                this.data[i].contentInfo.category = newName
            }
        }

    }

    // switchToCategory(category = null) {
    //     // let newCtgy = this.callBack.getAllCategories()
    //     // newCtgy.unshift("全部")
    //     this.reloadCategoryMenu()
    //     let newCtgy = $(this.categoryMenuId).items
    //     let index = category ? newCtgy.indexOf(category) : 0
    //     if (index == -1) {
    //         console.error("Error: category not found.")
    //         return
    //     }

    //     // $(this.categoryMenuId).items = newCtgy
    //     $(this.categoryMenuId).index = index
    //     this.categoryChanged()

    // }

    // methods
    getNextPageData() {
        const DEGREE_COLORS = [
            $color("#ff0000"),
            $color("#ff0077"),
            $color("#ff00ff"),
            $color("#7700ff"),
            $color("#0000ff"),
            $color("#00ccff"),
            $color("#00ffff"),
            $color("#00ff00")
        ]
        let newMemory = this.callBack.getMemoryByPage(
            this.nextPage++,
            this.pageSize,
            this.callBack.getCurrentCategory()
        )
        if (!newMemory) this.nextPage--
        let newData = []
        for (const mem of newMemory) {
            newData.push({
                // for saving data
                id: mem.id,
                contentInfo: mem.contentInfo,

                // for template
                snapshot: {
                    src: mem.contentInfo.sPath
                },
                memory_desc: {
                    text: mem.contentInfo.desc
                },
                degree_indicator: {
                    bgcolor: DEGREE_COLORS[mem.degree]
                },
                detailed_info: {
                    text: mem.detailedInfo
                }
            })
        } // for
        return newData
    } // loadNextPage

    quickLook(type, path) {
        if (type == ContentType.image) {
            $quicklook.open({
                url: "file://" + $file.absolutePath(path)
            })
        } else if (type == ContentType.markdown) {
            let md = $file.read(path).string
            let html = $text.markdownToHtml(md)
            $quicklook.open({ html: html })
        } else console.error("Error: unsupported content type.")
    } // quicklook

    refreshMemoryList() {
        $(this.id).beginRefreshing()
        $(this.headerId).text = "刷新中..."
        $delay(0.5, () => {
            this.nextPage = 0
            this.data = this.getNextPageData()
            $(this.id).endRefreshing()
            $(this.id).data = this.data
            $(this.headerId).text = "所有记录"
        })
    }
} // class

module.exports = MemoryListView