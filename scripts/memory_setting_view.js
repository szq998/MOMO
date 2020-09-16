let PopView = require("./pop_view.js")
let ContentView = require("./content_view.js")

const ContentType = {
    image: 0,
    markdown: 1
}

const MIN_DESC_LEN = 5
const MAX_CATEGORY_LEN = 10
const CONTENT_WIDTH = 220
const CONTENT_HEIGHT_WIDTH_RATIO = 2 / 3

class ContentSettingView extends ContentView {
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
                        else this.showNoContent(this.contentType)
                    }
                }
            ]
        }
    }

    contentSettingHandler(sender) {
        if (this.contentType == ContentType.image) {
            this.imageSettingHandler()
        } else if (this.contentType == ContentType.markdown) {
            this.markdownSettingHandler(sender)
        } else console.error("Error: unsupported content type.")
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
        let finishHandler = () => {
            popoverInput.dismiss()
            let text = $(inputId).text
            if (text) this.changeContent(ContentType.markdown, text)
            else this.showNoContent(ContentType.markdown, text)
        }

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
                            finishHandler
                        )
                    },
                    layout: $layout.fill,
                    events: {
                        ready: sender => {
                            sender.focus()
                        }
                    }
                }
            ],
            dismissed: finishHandler
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
                            $(inputViewId).blur()
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

        this.isModifying = false
        this.modifyingId
        this.doAfterModified

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
            make.size.equalTo($size(CONTENT_WIDTH, 100))
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
            this.questionSetter.showNoContent(this.getContentType())
            this.answerSetter.showNoContent(this.getContentType())
        }
    } // constructor

    appear() {
        let cpItems = this.callBack.getAllCategories()
        cpItems.push("新增类别")
        $(this.idsOfMSV.categoryPicker).items = [cpItems]
        
        $(this.idsOfMSV.navBarView).hidden = false
        $ui.animate({
            animation: () => {
                $(this.idsOfMSV.navBarView).alpha = 1
            }
        })

        super.appear()
    }

    doBeforeClose() {
        $(this.idsOfMSV.descInput).blur()

        $ui.animate({
            animation: () => {
                $(this.idsOfMSV.navBarView).alpha = 0
            },
            conpletion: () => {
                $(this.idsOfMSV.navBarView).hidden = true
            }
        })
    }

    doAfterClose() {
        this.resetContent()
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

    getContentType() {
        if ($(this.id)) {
            let index = $(this.idsOfMSV.contentTypeSwitch).index
            if (index == 0) return ContentType.image
            else if (index == 1) return ContentType.markdown
            else console.error("Error: unsupported content type.")
        } else console.error("Error: this method must be called after render.")
    }

    setContentType(type) {
        if ($(this.id)) {
            if (type == ContentType.image) {
                $(this.idsOfMSV.contentTypeSwitch).index = 0
            } else if (type == ContentType.markdown) {
                $(this.idsOfMSV.contentTypeSwitch).index = 1
            } else console.error("Error: unsupported content type.")
        } else console.error("Error: this method must be called after render.")
    }

    setCategory(category) {
       let sr = $(this.idsOfMSV.categoryPicker).selectedRows
       let cpItems = $(this.idsOfMSV.categoryPicker).items[0]
       let index = cpItems.indexOf(category)
       console.log(cpItems)
       cpItems.unshift(cpItems.splice(index, 1)[0])
       console.log(cpItems)
       $(this.idsOfMSV.categoryPicker).items = [cpItems]
    }
    
    generateSnapshot() {
        let type = this.getContentType()
        let snapshot
        if (type == ContentType.image)
            snapshot = $(this.questionSetter.imageViewId).snapshot
        else if (type == ContentType.markdown)
            snapshot = $(this.questionSetter.markdownViewId).snapshot
        else console.error("Error: unsupported content type.")
        return snapshot
    }

    async finishHandler() {
        $(this.idsOfMSV.descInput).blur()

        let content = {
            type: this.getContentType(),
            desc: $(this.idsOfMSV.descInput).text.trim(),
            question: this.questionSetter.content,
            answer: this.answerSetter.content
        }
        if (
            content.desc.length >= MIN_DESC_LEN &&
            content.question &&
            content.answer
        ) {
            // decide category
            let index = $(this.idsOfMSV.categoryPicker).selectedRows[0]
            let cpItems = $(this.idsOfMSV.categoryPicker).items[0]
            if(index == cpItems.length - 1){
               // add new category
               let text = await $input.text({
                 type: $kbType.default,
                 placeholder: "输入新类别名",
               })
               // no input
               if(typeof text != "string") return
               text = text.trim()
               if(text.length >= MAX_CATEGORY_LEN) {
                 $ui.warning("类别名过长")
                 return
               }
               if (!this.callBack.addCategory(text)) {
                 $ui.warning("新增类别失败，可能与已有类别重名")
                 return
               }
               content.category = text
            } else content.category = cpItems[index]
            
            // generate snapshot
            content.snapshot = this.generateSnapshot()
            
            if (this.isModifying) {
                this.isModifying = false

                this.callBack.modify(this.modifyingId, content)
                this.doAfterModified()
                $ui.success("修改成功")
                this.disappear()
            } else {
                this.callBack.add(content)
                $ui.success("添加成功")
                this.resetContent()
            }
        } else {
            $ui.warning("描述过短或未选择图片")
        }
    }

    resetContent() {
        $(this.idsOfMSV.descInput).text = ""

        this.questionSetter.showNoContent(this.getContentType())
        this.answerSetter.showNoContent(this.getContentType())
    }

    editMemory(id, oldContent, doAfterModified) {
        this.setContentType(oldContent.type)
        $(this.idsOfMSV.descInput).text = oldContent.desc
        this.questionSetter.changeContent(oldContent.type, oldContent.question)
        this.answerSetter.changeContent(oldContent.type, oldContent.answer)

        this.isModifying = true
        this.modifyingId = id
        this.doAfterModified = doAfterModified

        this.appear()
        this.setCategory(oldContent.category)
    } // editMemory

    getTypeSwitchTab() {
        return {
            type: "tab",
            props: {
                id: this.idsOfMSV.contentTypeSwitch,
                bgcolor: $color("white", "clear"),
                dynamicWidth: true,
                items: [$image("photo"), $image("doc.richtext")]
            },
            layout: $layout.center,
            events: {
                changed: sender => {
                    this.questionSetter.showNoContent(this.getContentType())
                    this.answerSetter.showNoContent(this.getContentType())
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
                alpha: 0
            },
            layout: $layout.fill,
            views: [this.getFinishButton(), this.getTypeSwitchTab()]
        }
    }
} // class

module.exports = MemorySettingView