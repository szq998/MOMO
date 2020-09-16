const MIN_DESC_LEN = 5

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

        this.categoryMenuId = "category_menu_of_" + this.id
        this.categoryMenu = {
            type: "menu",
            props: {
                id: this.categoryMenuId,
                items: ["全部"].concat(callBack.getAllCategories()),
                dynamicWidth: true
            },
            layout: (make, view) => {
                make.top.left.right.equalTo(0)
                make.height.equalTo(40)
            },
            events: {
                changed: sender => {
                    this.categoryChanged()
                }
            }
        }

        this.headerLabelId = "mlv_header_of" + this.id
        let header = {
            type: "label",
            props: {
                id: this.headerLabelId,
                height: 20,
                text: "所有记录",
                textColor: $color("#AAAAAA"),
                align: $align.center,
                font: $font(12)
            }
        }

        this.footerId = "mlv_footer_of" + this.id
        let footer = {
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

        let menu = {
            //title: "Context Menu",
            items: [
                {
                    title: "编辑",
                    symbol: "pencil.and.ellipsis.rectangle",
                    inline: false,
                    items: [
                        {
                            title: "更改描述",
                            handler: (sender, indexPath, data) => {
                                $input.text({
                                    type: $kbType.default,
                                    placeholder: "输入新的描述",
                                    text: data.contentInfo.desc,
                                    handler: text => {
                                        text = text.trim()
                                        if (text.length >= MIN_DESC_LEN) {
                                            callBack.changeDescriptionById(
                                                data.id,
                                                text
                                            )
                                            // change data in list
                                            data.contentInfo.desc = text
                                            data.memory_desc.text = text
                                            this.data[indexPath.row] = data
                                            sender.data = this.data
                                        } else {
                                            $ui.warning("描述过短")
                                        }
                                    }
                                })
                            }
                        },
                        {
                            title: "更改内容",
                            handler: (sender, indexPath, data) => {
                                let updateListDataWithContentInfo = newContentInfo => {
                                    if (
                                        data.contentInfo.category ==
                                        newContentInfo.category
                                    ) {
                                        data.contentInfo = newContentInfo
                                        data.memory_desc.text =
                                            newContentInfo.desc
                                        data.snapshot.src = newContentInfo.sPath

                                        this.data[indexPath.row] = data
                                        sender.data = this.data
                                    } else {
                                        this.refresh(newContentInfo.category)
                                    }
                                }

                                callBack.changeContentById(
                                    data.id,
                                    updateListDataWithContentInfo
                                )
                            }
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

        let template = {
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
        } // template

        this.listId = "list_of_" + this.id
        this.list = {
            type: "list",
            props: {
                id: this.listId,
                style: 2,
                autoRowHeight: true,
                estimatedRowHeight: this.estimatedRowHeight,
                data: this.data,
                header: header,
                footer: footer,
                menu: menu,
                template: template,

                actions: [
                    {
                        title: "删除",
                        color: $color("red"),
                        handler: (sender, indexPath) => {
                            $ui.menu({
                                items: ["确认删除"],
                                handler: (title, idx) => {
                                    let deleted = this.data.splice(
                                        indexPath.row,
                                        1
                                    )[0]
                                    sender.data = this.data
                                    callBack.deleteById(deleted.id)
                                }
                            }) // $ui.menu
                        } // handler
                    }
                ] // actions
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
                    this.refresh()
                },
                didReachBottom: sender => {
                    $(this.footerId).hidden = false
                    let newData = this.getNextPageData()
                    this.data = this.data.concat(newData)
                    $delay(0.5, () => {
                        $(this.footerId).hidden = true
                        sender.endFetchingMore()
                        sender.data = this.data
                    })
                }, // didReachBottom
                didSelect: (sender, indexPath, data) => {
                    this.quickLook(
                        data.contentInfo.type,
                        data.contentInfo.qPath
                    )
                } // didSelected
            }, // events
            layout: (make, view) => {
                make.top.equalTo(view.prev.bottom)
                make.left.bottom.right.equalTo(0)
            }
        }

        this.toRender = {
            type: "view",
            props: {
                id: this.id
            },
            views: [this.categoryMenu, this.list],
            layout: layout
        }
    } // constructor

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
            this.getCurrentCategory()
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

    getCurrentCategory() {
        let index = $(this.categoryMenuId).index
        if (index > 0) return $(this.categoryMenuId).items[index]
        else return null
    }

    switchToCategory(category) {
        let newCtgy = this.callBack.getAllCategories()
        newCtgy.unshift("全部")

        let index = newCtgy.indexOf(category)
        if (index == -1) {
            console.error("Error: category not found.")
            return
        }

        $(this.categoryMenuId).items = newCtgy
        $delay(0.1, () => {
            $(this.categoryMenuId).index = index
        })
    }

    categoryChanged() {
        this.nextPage = 0
        this.data = this.getNextPageData()

        $(this.listId).data = this.data
    }

    refresh(categoty = null) {
        $(this.listId).beginRefreshing()
        $(this.headerLabelId).text = "刷新中..."
        if (categoty) this.switchToCategory(categoty)
        $delay(0.5, () => {
            this.nextPage = 0
            this.data = this.getNextPageData()
            $(this.listId).endRefreshing()
            $(this.listId).data = this.data
            $(this.headerLabelId).text = "所有记录"
        })
    }

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
} // class

module.exports = MemoryListView