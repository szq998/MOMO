const MIN_DESC_LEN = 5

const IMAGE_WIDTH = 80
const IMAGE_INSET = 5
const IMAGE_HEIGHT_WIDTH_RATIO = 2 / 3
const IMAGE_SIZE = $size(IMAGE_WIDTH, IMAGE_WIDTH / IMAGE_HEIGHT_WIDTH_RATIO)
const REAL_IMAGE_SIZE = $size(IMAGE_SIZE.width * $device.info.screen.scale, IMAGE_SIZE.height * $device.info.screen.scale)


class MemoryListView {
    constructor(id, callBack, layout) {
        this.id = id
        this.callBack = callBack
        this.nextPage
        this.data = []
        this.pageSize 
        this.estimatedRowHeight = IMAGE_WIDTH / IMAGE_HEIGHT_WIDTH_RATIO + 2 * IMAGE_INSET

        this.header_id = "mlv_header_of" + this.id
        let header = {
            type: "label",
            props: {
                id: this.header_id,
                height: 20,
                text: "所有记录",
                textColor: $color("#AAAAAA"),
                align: $align.center,
                font: $font(12)
            }
        }

        this.footer_id = "mlv_footer_of" + this.id
        let footer = {
            type: "label",
            props: {
                id: this.footer_id,
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
                                    text: data.desc,
                                    handler: text => {
                                        if (text.length >= MIN_DESC_LEN) {
                                            callBack.changeDescriptionById(data.id, text)
                                            // change data in list
                                            data.desc = text
                                            data.memory_desc.text = text
                                            this.data[indexPath.row] = data
                                            sender.data = this.data
                                        } else {
                                            $ui.warning("描述过短")
                                        }

                                    }
                                });
                            }
                        },
                        {
                            title: "更改内容",
                            handler: (sender, indexPath, data) => {
                                let updateListData = (newDesc, newQPath, newAPath) => {
                                    data.desc = newDesc
                                    data.qPath = newQPath
                                    data.aPath = newAPath

                                    data.memory_desc.text = newDesc
                                    data.q_image.image = $imagekit.scaleAspectFill($image(newQPath), REAL_IMAGE_SIZE)
                                    this.data[indexPath.row] = data
                                    sender.data = this.data
                                }

                                callBack.changeContentById(data.id, updateListData)
                            }
                        },
                    ]
                },
                {
                    title: "查看答案",
                    symbol: "lock.open",
                    destructive: true,
                    handler: (sender, indexPath, data) => {
                        $quicklook.open({
                            data: $data({ path: data.aPath })
                        })
                    }
                },
            ] // items
        } // menu

        let template = {
            views: [
                {
                    type: "image",
                    props: {
                        id: "q_image",
                        cornerRadius: 5,
                    },
                    layout: (make, view) => {
                        make.width.equalTo(IMAGE_WIDTH)
                        make.height.equalTo(view.width).multipliedBy(IMAGE_HEIGHT_WIDTH_RATIO)

                        make.top.left.bottom.inset(IMAGE_INSET)
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
                        make.top.equalTo(view.prev).offset(5)
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
                        make.bottom.equalTo(view.prev.prev).offset(-3)
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

        this.toRender = {
            type: "list",
            props: {
                id: this.id,
                                style: 2,
                bgcolor: $color("secondarySurface"),
                autoRowHeight: true,
                estimatedRowHeight: this.estimatedRowHeight,
                data: this.data,
                header: header,
                footer: footer,
                menu: menu,
                template: template,

                actions: [{
                    title: "删除",
                    color: $color("red"),
                    handler: (sender, indexPath) => {
                        $ui.menu({
                            items: ["确认删除"],
                            handler: (title, idx) => {
                                let deleted = this.data.splice(indexPath.row, 1)[0]
                                sender.data = this.data
                                callBack.deleteById(deleted.id)
                            }
                        }); // $ui.menu
                    } // handler
                }] // actions
            }, // props
            events: {
                ready: sender => {
                    sender.relayout()
                    this.nextPage = 0
                    let superSize = sender.super.size
                    let biggerSpan = superSize.height > superSize.width ? superSize.height : superSize.width 
                    biggerSpan = biggerSpan * $device.info.screen.scale
                    this.pageSize = parseInt(biggerSpan / this.estimatedRowHeight) + 1
                    console.log("page size is " + this.pageSize)
                    
                    this.data = this.getNextPageData()
                    sender.data = this.data
                },
                pulled: sender => {
                    this.refresh()
                },
                didReachBottom: sender => {
                    $(this.footer_id).hidden = false
                    let newData = this.getNextPageData()
                    this.data = this.data.concat(newData)
                    $delay(0.5, () => {
                        $(this.footer_id).hidden = true
                        sender.endFetchingMore()
                        sender.data = this.data
                    });
                }, // didReachBottom
                didSelect: (sender, indexPath, data) => {
                    $quicklook.open({
                        data: $data({ path: data.qPath })
                    })
                } // didSelected
            }, // events
            layout: layout
        } // toRender
    } // constructor

    refresh() {
        $(this.id).beginRefreshing()
        $(this.header_id).text = "刷新中..."
        this.nextPage = 0
        this.data = this.getNextPageData()
        $delay(0.5, () => {
            $(this.id).endRefreshing()
            $(this.id).data = this.data
            $(this.header_id).text = "所有记录"
        });

    }

    getNextPageData() {
        const DEGREE_COLORS = [$color("#ff0000"), $color("#ff0077"), $color("#ff00ff"), $color("#7700ff"), $color("#0000ff"), $color("#00ccff"), $color("#00ffff"), $color("#00ff00")]
        let newMemory = this.callBack.getMemoryByPage(
            this.nextPage++,
            this.pageSize
        )
        if (!newMemory) this.nextPage--
        let newData = []
        for (const mem of newMemory) {
            newData.push({
                // for saving data
                id: mem.id,
                desc: mem.desc,
                qPath: mem.qPath,
                aPath: mem.aPath,

                // for template
                q_image: {
                    image: $imagekit.scaleAspectFill($image(mem.qPath), REAL_IMAGE_SIZE)
                },
                memory_desc: {
                    text: mem.desc
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
} // class

module.exports = MemoryListView