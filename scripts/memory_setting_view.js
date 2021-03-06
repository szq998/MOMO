let PopView = require("./pop_view.js")
let ContentView = require("./content_view.js")

const ContentType = {
    markdown: 0,
    image: 1
}

const SWIPE_THRESHOLD = 60
const MIN_DESC_LEN = 5
const CONTENT_WIDTH = 200
const CONTENT_HEIGHT_WIDTH_RATIO = 2 / 3

class SwipableContentView extends ContentView {
    constructor(id) {
        super(id)
        this.placeholderViewId = "placeholder_view_of_" + id

        this.markdownTypeLayout = (make, view) => {
            make.centerY.equalTo(view.super)
            make.height.equalTo(view.super)
            make.width.equalTo(view.super).multipliedBy(2)

            make.centerX.equalTo(view.super.right)
        }
        this.imageTypeLayout = (make, view) => {
            make.centerY.equalTo(view.super)
            make.height.equalTo(view.super)
            make.width.equalTo(view.super).multipliedBy(2)

            make.centerX.equalTo(view.super.left)
        }

        let placeholderView = {
            type: "view",
            props: { id: this.placeholderViewId },
            views: [
                {
                    type: "image",
                    props: {
                        contentMode: $contentMode.scaleAspectFit,
                        symbol: "doc.richtext"
                    },
                    layout: (make, view) => {
                        make.left.top.bottom.equalTo(view.super)
                        make.width.equalTo(view.super).dividedBy(2)
                    }
                },
                {
                    type: "image",
                    props: {
                        contentMode: $contentMode.scaleAspectFit,
                        symbol: "photo"
                    },
                    layout: (make, view) => {
                        make.right.top.bottom.equalTo(view.super)
                        make.width.equalTo(view.super).dividedBy(2)
                    }
                }
            ],
        }

        this.setEvents("touchesBegan", (sender, location) => {
            if ($(this.placeholderViewId).hidden) return

            sender.info = {
                whereTouchBegan: location.x,
                initialPos: $(this.placeholderViewId).frame.x,
                needTaptic: true
            }
        })
        this.setEvents("touchesMoved", (sender, location) => {
            if ($(this.placeholderViewId).hidden) return

            let offset = location.x - sender.info.whereTouchBegan
            if (this.contentType == ContentType.markdown && offset > 0) return
            if (this.contentType == ContentType.image && offset < 0) return

            if (Math.abs(offset) > SWIPE_THRESHOLD && sender.info.needTaptic) {
                let newInfo = sender.info
                newInfo.needTaptic = false
                sender.info = newInfo
                $device.taptic(2)
            }
            if (Math.abs(offset) < SWIPE_THRESHOLD) {
                let newInfo = sender.info
                newInfo.needTaptic = true
                sender.info = newInfo
            }

            let frame = $(this.placeholderViewId).frame
            $(this.placeholderViewId).frame = $rect(
                sender.info.initialPos + offset,
                frame.y,
                frame.width,
                frame.height
            )
        })
        this.setEvents("touchesEnded", (sender, location) => {
            if ($(this.placeholderViewId).hidden) return

            let offset = location.x - sender.info.whereTouchBegan
            if (Math.abs(offset) < SWIPE_THRESHOLD || this.contentType == ContentType.markdown && offset > 0 || this.contentType == ContentType.image && offset < 0) {
                // sender.userInteractionEnabled = false
                $ui.animate({
                    damping: 0.6,
                    animation: () => {
                        let frame = $(this.placeholderViewId).frame
                        $(this.placeholderViewId).frame = $rect(
                            sender.info.initialPos,
                            frame.y,
                            frame.width,
                            frame.height
                        )
                    }, // animation
                    // completion: () => { sender.userInteractionEnabled = true }
                }) // $ui.animate
            } else if (Math.abs(offset) > SWIPE_THRESHOLD) {
                let targetType = this.contentType == ContentType.image ? ContentType.markdown : ContentType.image
                // sender.userInteractionEnabled = false
                $ui.animate({
                    damping: 0.6,
                    animation: () => {
                        this.changeType(targetType)
                    },
                    // completion: () => { sender.userInteractionEnabled = true }
                }) // $ui.animate
            }
        })
        this.toRender.views.push(placeholderView)
    }

    clearContent(contentType = null) {
        if (contentType == null && typeof this.contentType == "undefined") {
            $console.error("Error: content type not yet be set. Must specify content type.");
        }

        if (contentType == null ? true : this.changeType(contentType)) {
            this.content = null
            $(this.placeholderViewId).hidden = false
            $(this.imageViewId).hidden = true
            $(this.markdownViewId).hidden = true
            return true
        } else return false
    }

    changeContent(contentType, content) {
        if (super.changeContent(contentType, content)) {
            $(this.placeholderViewId).hidden = true
            return true
        } else return false
    }

    changeType(contentType) {
        if (super.changeType(contentType)) {
            if (this.contentType == ContentType.image) $(this.placeholderViewId).remakeLayout(this.imageTypeLayout)
            else if (this.contentType == ContentType.markdown) $(this.placeholderViewId).remakeLayout(this.markdownTypeLayout)
            $(this.placeholderViewId).relayout()
            return true
        } else return false
    }
} // class

class ContentSettingView extends SwipableContentView {
    constructor(id) {
        super(id)
        this.setProps("cornerRadius", 10)
        this.setProps("borderWidth", 1)
        this.setProps("borderColor", $color("gray"))
        this.setProps("menu", this.makeContentSetterMenu())

        this.setEvents("tapped", sender => {
            this.contentSettingHandler(sender)
        })
    } // constructor

    makeContentSetterMenu() {
        return {
            items: [
                {
                    title: "查看",
                    symbol: "magnifyingglass",
                    handler: sender => {
                        if (!this.quickLook()) $ui.toast("当前无内容")
                    }
                },
                {
                    title: "清除",
                    symbol: "trash",
                    destructive: true,
                    handler: sender => {
                        if (!this.content) $ui.toast("当前无内容")
                        else this.clearContent()
                    }
                }
            ]
        }
    }

    contentSettingHandler(sender) {
        if (this.contentType == ContentType.image)
            this.imageSettingHandler()
        else if (this.contentType == ContentType.markdown)
            this.markdownSettingHandler(sender)
        else console.error("Error: unsupported content type.")
    } // contentSettingHaandler

    imageSettingHandler() {
        let image
        let cbImageData = $clipboard.image
        if (cbImageData) {
            image = cbImageData.image

            this.changeContent(ContentType.image, image)
            // notify
            $ui.toast("获取到剪贴板中的照片，已清理剪贴板")
            // clear clipboard
            $clipboard.clear()
        } else {
            $photo.prompt({
                handler: resp => {
                    image = resp.image
                    if (image) {
                        this.changeContent(ContentType.image, image)
                    }
                }
            })
        } // if cbImageData
    }

    markdownSettingHandler(sender) {
        let inputId = "markdown_input_of_" + this.id

        const popoverInput = $ui.popover({
            sourceView: sender,
            sourceRect: sender.bounds, // default
            directions: $popoverDirection.any, // default
            views: [
                {
                    type: "text",
                    props: {
                        id: inputId,
                        bgcolor: $color("secondarySurface"),
                        text: this.content ? this.content : "",
                        accessoryView: this.makeInputAcceView(
                            inputId,
                            "输入markdown",
                            () => {
                                popoverInput.dismiss()
                            }
                        )
                    },
                    layout: $layout.fill,
                    events: { ready: sender => { sender.focus() } }
                }
            ],
            dismissed: () => {
                let text = $(inputId).text
                if (text) this.changeContent(ContentType.markdown, text)
                else this.clearContent(ContentType.markdown, text)
            }
        })
    }

    makeInputAcceView(inputViewId, text, finishHandler) {
        return {
            type: "view",
            props: {
                height: 35
            },
            views: [
                {
                    type: "label",
                    props: {
                        text: text,
                        font: $font(13),
                        textColor: $color("darkGray")
                    },
                    layout: (make, view) => {
                        make.center.equalTo(view.super)
                    }
                },
                {
                    type: "button",
                    props: {
                        title: "预览"
                    },
                    layout: (make, view) => {
                        make.width.equalTo(60)
                        make.top.bottom.left.inset(3)
                    },
                    events: {
                        tapped: sender => {
                            let text = $(inputViewId).text
                            if (text) {
                                this.changeContent(ContentType.markdown, text)
                                this.quickLook()
                            } else $ui.toast("当前无内容")
                        }
                    }
                },
                {
                    type: "button",
                    props: {
                        title: "完成"
                    },
                    layout: (make, view) => {
                        make.width.equalTo(60)
                        make.top.bottom.right.inset(3)
                    },
                    events: {
                        tapped: sender => {
                            // $(inputViewId).blur()
                            finishHandler()
                        }
                    }
                }
            ]
        } // return
    } // makeInputAcceView
} // class

class MemorySettingView extends PopView {
    constructor(id, callBack) {
        super(id)
        this.callBack = callBack

        this.modifyingId
        this.addingFinish
        this.editingFinish

        this.idsOfMSV = {
            descInputLabel: "description_nput_label_of_" + id,
            descInput: "description_input_of_" + id,
            contentTypeSwitch: "content_type_switch_of_" + id,
            questionSetter: "question_setter_of_" + id,
            questionSettingLabel: "question_setting_label_of_" + id,
            answerSetter: "answer_setter_of_" + id,
            answerSettingLabel: "answer_setting_label_of_" + id,
            finishButton: "finish_button_of_" + id,
            navBarView: "nav_bar_view_of_" + id,
            categoryPicker: "category_picker_of_" + id,
            categoryPickingLabel: "category_picking_label" + id
        }

        let descInput = {
            type: "text",
            props: {
                id: this.idsOfMSV.descInput,
                placeholder: "问题描述",
                cornerRadius: 10,
                accessoryView: this.makeInputAcceView(
                    this.idsOfMSV.descInput,
                    "请至少输入5个字符"
                )
            }, // props
            layout: (make, view) => {
                make.centerX.equalTo(view.super)
                make.centerY.equalTo(view.super).offset(-250)
                make.size.equalTo($size(CONTENT_WIDTH, 45))
            }
        }

        let descInputLabel = this.makeLabelView(
            this.idsOfMSV.descInputLabel,
            "描述",
            (make, view) => {
                make.leading.equalTo($(this.idsOfMSV.descInput).leading)
                make.bottom.equalTo($(this.idsOfMSV.descInput).top).offset(-3)
            }
        )

        this.questionSetter = new ContentSettingView(
            this.idsOfMSV.questionSetter
        )
        this.questionSetter.setLayout((make, view) => {
            make.centerX.equalTo(view.super)
            make.top.equalTo($(this.idsOfMSV.descInput).bottom).offset(40)

            make.width.equalTo(CONTENT_WIDTH)
            make.height
                .equalTo(view.width)
                .multipliedBy(CONTENT_HEIGHT_WIDTH_RATIO)
        })

        this.answerSetter = new ContentSettingView(this.idsOfMSV.answerSetter)
        this.answerSetter.setLayout((make, view) => {
            make.centerX.equalTo(view.super)
            make.top.equalTo($(this.idsOfMSV.questionSetter).bottom).offset(40)

            make.width.equalTo(CONTENT_WIDTH)
            make.height
                .equalTo(view.width)
                .multipliedBy(CONTENT_HEIGHT_WIDTH_RATIO)
        })

        let questionSettingLabel = this.makeLabelView(
            this.idsOfMSV.questionSettingLabel,
            "问题",
            (make, view) => {
                make.leading.equalTo(view.prev.leading)
                make.bottom.equalTo(view.prev.top).offset(-3)
            }
        )

        let answerSettingLabel = this.makeLabelView(
            this.idsOfMSV.answerSettingLabel,
            "答案",
            (make, view) => {
                make.leading.equalTo(view.prev.leading)
                make.bottom.equalTo(view.prev.top).offset(-3)
            }
        )

        let categoryPicker = {
            type: "picker",
            props: {
                id: this.idsOfMSV.categoryPicker,
                items: [["新增类别"]],
                borderWidth: 1,
                borderColor: $color("gray"),
                cornerRadius: 10
            },
            layout: (make, view) => {
                make.centerX.equalTo(view.super)
                make.top.equalTo($(this.idsOfMSV.answerSetter).bottom).offset(40)
                make.size.equalTo($(this.idsOfMSV.answerSetter))
            }
        }

        let categoryPickingLabel = this.makeLabelView(
            this.idsOfMSV.categoryPickingLabel,
            "类别",
            (make, view) => {
                make.leading.equalTo($(this.idsOfMSV.categoryPicker).leading)
                make.bottom.equalTo($(this.idsOfMSV.categoryPicker).top).offset(-3)
            }
        )

        let viewsOfMemorySettingView = [
            descInput,
            //            contentTypeSwitch,
            descInputLabel,
            this.questionSetter.toRender,
            questionSettingLabel,
            this.answerSetter.toRender,
            answerSettingLabel,
            categoryPicker,
            categoryPickingLabel
            //            finishButton
        ]

        this.addViews(viewsOfMemorySettingView)

        this.toRender.events["ready"] = sender => {
            let lastType = $cache.get("using") && $cache.get("using").lastType ? $cache.get("using").lastType : 0

            this.questionSetter.clearContent((lastType >> 0) & 1)
            this.answerSetter.clearContent((lastType >> 1) & 1)
        }
    } // constructor

    appear() {
        // let cpItems = this.callBack.getAllCategories()
        // cpItems.push("新增类别")
        // $(this.idsOfMSV.categoryPicker).items = [cpItems]

        $(this.idsOfMSV.navBarView).hidden = false
        // $ui.animate({
        // animation: () => {
        // $(this.idsOfMSV.navBarView).alpha = 1
        // }
        // })

        super.appear()
    }

    doBeforeClose() {
        $(this.idsOfMSV.descInput).blur()

        // $ui.animate({
        // animation: () => {
        // $(this.idsOfMSV.navBarView).alpha = 0
        // },
        // completion: () => {
        $(this.idsOfMSV.navBarView).hidden = true
        // }
        // })
    }

    doAfterClose() {
        this.resetContent()
        if (this.editingFinish) this.editingFinish = undefined
    }

    makeLabelView(id, text, layout) {
        return {
            type: "label",
            props: {
                id: id,
                textColor: $color("secondaryText"),
                text: text,
                font: $font(15)
            },
            layout: layout
        }
    }

    makeInputAcceView(inputViewId, text) {
        return {
            type: "view",
            props: {
                height: 35
            },
            views: [
                {
                    type: "label",
                    props: {
                        text: text,
                        font: $font(13),
                        textColor: $color("darkGray")
                    },
                    layout: (make, view) => {
                        make.center.equalTo(view.super)
                    }
                },
                {
                    type: "button",
                    props: {
                        title: "完成"
                    },
                    layout: (make, view) => {
                        make.width.equalTo(60)
                        make.top.bottom.right.inset(3)
                    },
                    events: {
                        tapped: sender => {
                            $(inputViewId).blur()
                        }
                    }
                }
            ]
        } // return
    } // makeInputAcceView

    getType() {
        return (this.questionSetter.contentType << 0) | (this.answerSetter.contentType << 1)
    }

    setType(type) {
        this.questionSetter.changeType((type >> 0) & 1)
        this.answerSetter.changeType((type >> 1) & 1)
    }

    setCategory(category, atTail = false) {
        let cpItems = this.callBack.getAllCategories()
        let index = cpItems.indexOf(category)
        if (atTail) cpItems.push(cpItems.splice(index, 1)[0])
        else cpItems.unshift(cpItems.splice(index, 1)[0])
        cpItems.push("新增类别")
        $(this.idsOfMSV.categoryPicker).items = [cpItems]
    }

    generateSnapshot() {
        let qContentType = this.getType() & 1
        let snapshot
        if (qContentType == ContentType.image)
            snapshot = $(this.questionSetter.imageViewId).snapshot
        else if (qContentType == ContentType.markdown)
            snapshot = $(this.questionSetter.markdownViewId).snapshot
        else console.error("Error: unsupported content type.")
        return snapshot
    }

    async finishHandler() {
        $(this.idsOfMSV.descInput).blur()

        let mem = {
            type: this.getType(),
            desc: $(this.idsOfMSV.descInput).text.trim(),
            question: this.questionSetter.content,
            answer: this.answerSetter.content
        }
        if (
            mem.desc.length >= MIN_DESC_LEN &&
            mem.question &&
            mem.answer
        ) {
            // decide category
            let index = $(this.idsOfMSV.categoryPicker).selectedRows[0]
            let cpItems = $(this.idsOfMSV.categoryPicker).items[0]
            if (index == cpItems.length - 1) {
                let newCtgy = await this.callBack.inputCategory()
                if (!newCtgy) return

                if (!this.callBack.addCategory(newCtgy)) {
                    $ui.warning("添加新类别失败，可能与已有类别重复")
                    return
                }

                mem.category = newCtgy
                this.setCategory(newCtgy, true)
            } else mem.category = cpItems[index]

            // generate snapshot
            mem.snapshot = this.generateSnapshot()

            if (this.editingFinish) {
                this.callBack.modify(this.modifyingId, mem)

                this.editingFinish()
                this.editingFinish = undefined

                $ui.success("修改成功")
                this.disappear()
            } else {
                this.callBack.add(mem)

                this.addingFinish(mem.category)

                $ui.success("添加成功")
                this.resetContent()
            }
            $cache.set("using", { lastType: mem.type })
        } else {
            $ui.warning("描述过短或未选择图片")
        }
    }

    resetContent() {
        $(this.idsOfMSV.descInput).text = ""

        this.questionSetter.clearContent()
        this.answerSetter.clearContent()
    }

    addMemory() {
        let cpItems = this.callBack.getAllCategories()
        cpItems.push("新增类别")
        $(this.idsOfMSV.categoryPicker).items = [cpItems]

        this.appear()

        return new Promise(resolve => {
            this.addingFinish = resolve
        })
    }

    editMemory(id, oldMem) {
        this.setType(oldMem.type)
        this.setCategory(oldMem.category)
        $(this.idsOfMSV.descInput).text = oldMem.desc
        this.questionSetter.changeContent((oldMem.type >> 0) & 1, oldMem.question)
        this.answerSetter.changeContent((oldMem.type >> 1) & 1, oldMem.answer)

        this.modifyingId = id

        this.appear()

        return new Promise(resolve => {
            this.editingFinish = resolve
        })
    } // editMemory

    getTypeSwitchTab() {
        return {
            type: "tab",
            props: {
                id: this.idsOfMSV.contentTypeSwitch,
                bgcolor: $color("white", "clear"),
                dynamicWidth: true,
                items: [$image("doc.richtext"), $image("photo")]
            },
            layout: $layout.center,
            events: {
                changed: sender => {
                    $device.taptic(2)
                    this.questionSetter.clearContent(sender.index)
                    this.answerSetter.clearContent(sender.index)
                }
            }
        }
    }

    getFinishButton() {
        return {
            type: "button",
            props: {
                id: this.idsOfMSV.finishButton,
                title: "完成",
                bgcolor: $color("clear"),
            },
            layout: (make, view) => {
                make.centerY.equalTo(0)
                make.right.equalTo(0)
            },
            events: {
                tapped: sender => {
                    this.finishHandler()
                }
            } // events
        } // finishButton
    }

    getNavBarView() {
        return {
            type: "view",
            props: {
                id: this.idsOfMSV.navBarView,
                hidden: true,
                // alpha: 0
            },
            layout: $layout.fill,
            views: [this.getFinishButton(), this.getTypeSwitchTab()]
        }
    }
} // class

module.exports = MemorySettingView