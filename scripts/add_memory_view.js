let PopView = require("./pop_view.js")

const MIN_DESC_LEN = 5
const IMAGE_WIDTH = 150
const IMAGE_HEIGHT_WIDTH_RATIO = 2 / 3
const IMAGE_SIZE = $size(IMAGE_WIDTH, IMAGE_WIDTH / IMAGE_HEIGHT_WIDTH_RATIO)
const REAL_IMAGE_SIZE = $size(IMAGE_SIZE.width * $device.info.screen.scale, IMAGE_SIZE.height * $device.info.screen.scale)


function makeLabel(id, text, layout) {
    return {
        type: "label",
        props: {
            id: id,
            //            borderWidth: 2,
            //            autoFontSize: true,
            //            borderColor: $color("black"),
            // textColor: $color("white"),
            textColor: $color("secondaryText"),
            text: text,
            //            align: $align.center,
            font: $font(15)
            //            size: $size(800, 100)
        },
        layout: layout
    }
}

function makeImagePicker(id, layout, callBack, callBackWithImage) {
    return {
        type: "image",
        props: {
            id: id,
            cornerRadius: 10,
            // bgcolor: $color("white"),
            // bgcolor: $color("tertiarySurface"),
            borderWidth: 1,
            borderColor: $color("gray"),
            symbol: "photo.fill",
        },
        layout: layout,
        events: {
            tapped: sender => {
                callBack()

                let image
                let cbImageData = $clipboard.image
                if (cbImageData) {
                    image = cbImageData.image
                    sender.image = $imagekit.scaleAspectFill(image, REAL_IMAGE_SIZE)
                    callBackWithImage(image)
                    // notify
                    $ui.toast("获取到剪贴板中的照片，已清理剪贴板")
                    // clear clipboard
                    $clipboard.clear()
                } else {
                    $photo.prompt({
                        handler: function (resp) {
                            image = resp.image
                            if (image) {
                                sender.image = $imagekit.scaleAspectFill(image, REAL_IMAGE_SIZE)
                                callBackWithImage(image)
                            }
                        }
                    })
                } // if - else
            }
        }
    }
}

class AddMemoryView extends PopView {
    constructor(id, callBack) {
        super(id)

        this.isModifying = false
        this.modifyingId
        this.doAfterModified

        this.pickedQuestion = undefined
        this.pickedAnswer = undefined

        this.idsOfAMV = {
            desc_input_label: "desc_input_label_of_" + id,
            desc_input: "description_input_of_" + id,
            i_question_picker: "image_question_picker_of_" + id,
            question_picker_label: "question_picker_label_of_" + id,
            i_answer_picker: "image_answer_picker_of_" + id,
            answer_picker_label: "answer_picker_label_of_" + id,
            finish_button: "finish_button_of_" + id
        }

        let descInput = {
            type: "text",
            props: {
                id: this.idsOfAMV.desc_input,
                placeholder: "问题描述",
                cornerRadius: 10,
                accessoryView: {
                    type: "view",
                    props: {
                        height: 35
                    },
                    views: [
                        {
                            type: "label",
                            props: {
                                text: "请至少输入5个字符",
                                //                                autoFontSize: true,
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
                                    $(this.idsOfAMV.desc_input).blur()
                                }
                            }
                        }
                    ]
                } // accessoryView
            }, // props
            layout: (make, view) => {
                make.centerX.equalTo(view.super)
                make.centerY.equalTo(view.super).offset(-180)
                make.size.equalTo($size(150, 60))
            }
        }

        let descInputLabel = makeLabel(
            this.idsOfAMV.desc_input_label,
            "描述",
            (make, view) => {
                make.leading.equalTo(view.prev.leading)
                make.bottom.equalTo(view.prev.top).offset(-3)
            }
        )

        let imageQuestionPicker = makeImagePicker(
            this.idsOfAMV.i_question_picker,
            (make, view) => {
                make.centerX.equalTo(view.super)
                make.top.equalTo(view.prev.prev.bottom).offset(40)

                make.width.equalTo(IMAGE_WIDTH)
                make.height.equalTo(view.width).multipliedBy(IMAGE_HEIGHT_WIDTH_RATIO)
            },
            () => {
                $(this.idsOfAMV.desc_input).blur()
            },
            image => {
                this.pickedQuestion = image
            } //
        ) // makeImagePicker

        let questionPickLabel = makeLabel(
            this.idsOfAMV.question_picker_label,
            "问题",
            (make, view) => {
                make.leading.equalTo(view.prev.leading)
                make.bottom.equalTo(view.prev.top).offset(-3)
            }
        )

        let imageAnswerPicker = makeImagePicker(
            this.idsOfAMV.i_answer_picker,
            (make, view) => {
                make.centerX.equalTo(view.super)
                make.top.equalTo(view.prev.prev.bottom).offset(40)

                make.width.equalTo(IMAGE_WIDTH)
                make.height.equalTo(view.width).multipliedBy(IMAGE_HEIGHT_WIDTH_RATIO)
            },
            () => {
                $(this.idsOfAMV.desc_input).blur()
            },
            image => {
                this.pickedAnswer = image
            }
        )

        let answerPickLabel = makeLabel(
            this.idsOfAMV.answer_picker_label,
            "答案",
            (make, view) => {
                make.leading.equalTo(view.prev.leading)
                make.bottom.equalTo(view.prev.top).offset(-3)
            }
        )

        let finishButton = {
            type: "button",
            props: {
                id: this.idsOfAMV.finish_button,
                title: "完成"
            },
            layout: (make, view) => {
                make.centerX.equalTo(view.super)
                make.top.equalTo(view.prev.prev.bottom).offset(30)
                make.size.equalTo($size(120, 40))
            },
            events: {
                tapped: sender => {
                    $(this.idsOfAMV.desc_input).blur()

                    let desc = $(this.idsOfAMV.desc_input).text
                    if (
                        desc.length >= MIN_DESC_LEN &&
                        this.pickedQuestion &&
                        this.pickedAnswer
                    ) {
                        if (this.isModifying) {
                            this.isModifying = false
                            callBack.modify(
                                this.modifyingId,
                                desc,
                                this.pickedQuestion,
                                this.pickedAnswer
                            )
                            this.doAfterModified()
                            $ui.success("修改成功")
                            this.disappear()
                        } else {
                            callBack.add(
                                desc,
                                this.pickedQuestion,
                                this.pickedAnswer
                            )
                            $ui.success("添加成功")
                        }
                        this.resetContent()
                    } else {
                        $ui.warning("描述过短或未选择图片")
                    }
                }
            } // events
        } // finishButton

        let viewsOfAddMemoryView = [
            descInput,
            descInputLabel,
            imageQuestionPicker,
            questionPickLabel,
            imageAnswerPicker,
            answerPickLabel,
            finishButton
        ]

        this.addViews(viewsOfAddMemoryView)
    } // constructor

    doBeforeClose() {
        $(this.idsOfAMV.desc_input).blur()
    }

    doAfterClose() {
        this.resetContent()
    }

    resetContent() {
        $(this.idsOfAMV.desc_input).text = ""
        $(this.idsOfAMV.i_question_picker).image = $image("photo.fill")
        $(this.idsOfAMV.i_answer_picker).image = $image("photo.fill")
        this.pickedQuestion = undefined
        this.pickedAnswer = undefined
    }

    editMemory(id, oldContent, doAfterModified) {
        this.pickedQuestion = $image(oldContent.qPath)
        this.pickedAnswer = $image(oldContent.aPath)
        $(this.idsOfAMV.desc_input).text = oldContent.description
        $(this.idsOfAMV.i_question_picker).image = $imagekit.scaleAspectFill(this.pickedQuestion, REAL_IMAGE_SIZE)
        $(this.idsOfAMV.i_answer_picker).image = $imagekit.scaleAspectFill(this.pickedAnswer, REAL_IMAGE_SIZE)
        
        this.isModifying = true
        this.modifyingId = id
        this.doAfterModified = doAfterModified

        this.appear()
    } // editMemory
} // class

module.exports = AddMemoryView
