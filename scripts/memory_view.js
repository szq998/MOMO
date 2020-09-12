let ContentView = require("./content_view.js")

const ContentType = {
  image: 0,
  markdown: 1
}

const IMAGE_WIDTH = 400
const IMAGE_HEIGHT_WIDTH_RATIO = 2 / 3
const IMAGE_SIZE = $size(IMAGE_WIDTH, IMAGE_WIDTH / IMAGE_HEIGHT_WIDTH_RATIO)
const REAL_IMAGE_SIZE = $size(IMAGE_SIZE.width * $device.info.screen.scale, IMAGE_SIZE.height * $device.info.screen.scale)

const CLOSE_THRESHOLD = 80

class MovableContentView extends ContentView {
    constructor(id) {
        super(id)
        
        this.layoutForSize = (make, view) => {
            make.width.equalTo(IMAGE_WIDTH)
            make.width.lessThanOrEqualTo(view.super.width).offset(-30)
            make.height.equalTo(view.width).multipliedBy(IMAGE_HEIGHT_WIDTH_RATIO)
        }

        this.initialLayout = (make, view) => {
            this.layoutForSize(make, view)
            make.center.equalTo(view.super)
        }
        
        this.setProps("cornerRadius", 10)
    } // constructor

    reset() {
        $ui.animate({
            animation: () => {
                $(this.id).remakeLayout(this.initialLayout)
                $(this.id).relayout()
            }
        })
    } // reset
} // class ContentView

class QuestionView extends MovableContentView {
    constructor(id) {
        super(id)

        this.revealedLayout = (make, view) => {
            this.layoutForSize(make, view)

            make.centerX.equalTo(view.super)
            make.bottom.equalTo(view.super.centerY).offset(-10)
        }
    } // constructor

    moveUp() {
        $ui.animate({
            damping: 0.7,
            animation: () => {
                $(this.id).remakeLayout(this.revealedLayout)
                $(this.id).relayout()
            }
        })
    } // moveUp
} // class QuestionView

class AnswerView extends MovableContentView {
    constructor(id) {
        super(id)
        this.answerBlurId = "blur_of_" + id

        this.revealedLayout = (make, view) => {
            this.layoutForSize(make, view)

            make.centerX.equalTo(view.super)
            make.top.equalTo(view.super.centerY).offset(10)
        }

        let answerBlur = {
            type: "blur",
            props: {
                id: this.answerBlurId,
                style: 2,
                alpha: 0
            },
            layout: $layout.fill
        }

        this.toRender.views.push(answerBlur)
    } // constructor

    moveDown() {
        $ui.animate({
            damping: 0.7,
            animation: () => {
                $(this.answerBlurId).alpha = 0
                $(this.id).remakeLayout(this.revealedLayout)
                $(this.id).relayout()
            }
        })
    } // moveDown

    resetAndChangeContent(contentType, content) {
        this.reset()
        $ui.animate({
            duration: 0.2,
            animation: () => {
                $(this.answerBlurId).alpha = 1
            },
            completion: () => {
                this.changeContent(contentType, content)
            }
        })
    }
} // class AnswerView

class MemoryView {
    constructor(id, callBack) {
        this.revealed = false

        this.qViewId = "qv"
        this.aViewId = "av"
        this.questionView = new QuestionView(this.qViewId)
        this.answerView = new AnswerView(this.aViewId)
        this.buttonAreaId = "button_area" + id

        this.questionView.setEvents("touchesBegan", (sender, location) => {
            if (!this.revealed)
                sender.info = {
                    whereTouchBegan: location.y,
                    initialQPos: $(this.qViewId).frame.y,
                    initialAPos: $(this.aViewId).frame.y,
                    needTaptic: true
                }
        }) // touchesBegan
        this.questionView.setEvents("touchesMoved", (sender, location) => {
            if (!this.revealed) {
                // change position
                let targetQ = $(this.qViewId)
                let targetA = $(this.aViewId)
                let offset = location.y - sender.info.whereTouchBegan
                if (-offset > CLOSE_THRESHOLD && sender.info.needTaptic) {
                    let newInfo = sender.info
                    newInfo.needTaptic = false
                    sender.info = newInfo
                    $device.taptic(2)
                }
                if (-offset < CLOSE_THRESHOLD) {
                    let newInfo = sender.info
                    newInfo.needTaptic = true
                    sender.info = newInfo
                }
                targetQ.frame = $rect(
                    targetQ.frame.x,
                    sender.info.initialQPos + offset / 2,
                    targetQ.size.width,
                    targetQ.size.height
                )
                targetA.frame = $rect(
                    targetA.frame.x,
                    sender.info.initialAPos - offset / 2,
                    targetA.size.width,
                    targetA.size.height
                )
            } // if revealed
        }) // touchesMoved
        this.questionView.setEvents("touchesEnded", (sender, location) => {
            if (!this.revealed) {
                if (
                    sender.info.whereTouchBegan - location.y >
                    CLOSE_THRESHOLD
                ) {
                    this.revealAnswer()
                } else {
                    sender.userInteractionEnabled = false
                    $ui.animate({
                        damping: 0.6,
                        animation: () => {
                            let targetQ = $(this.qViewId)
                            let targetA = $(this.aViewId)

                            targetQ.frame = $rect(
                                targetQ.frame.x,
                                sender.info.initialQPos,
                                targetQ.size.width,
                                targetQ.size.height
                            )
                            targetA.frame = $rect(
                                targetA.frame.x,
                                sender.info.initialAPos,
                                targetA.size.width,
                                targetA.size.height
                            )
                        }, // animation
                        completion: () => {
                            sender.userInteractionEnabled = true
                        }
                    }) // $ui.animate
                } // if - else
            } // if revealed
        }) // touchesEnded


        let buttonArea = {
            type: "stack",
            props: {
                id: this.buttonAreaId,
                userInteractionEnabled: false,
                alpha: 0.5,
                //bgcolor: $color("black"),
                axis: $stackViewAxis.horizontal,
                spacing: 20,
                distribution: $stackViewDistribution.fillEqually,
                //alignment: $stackViewAlignment.fill,
                stack: {
                    views: [
                        this.makeRememberForgetButton(
                            "103",
                            $color("green"),
                            callBack.remember
                        ),
                        this.makeRememberForgetButton(
                            "119",
                            $color("yellow"),
                            callBack.forget
                        )
                    ] // views
                } // stack
            }, // props
            layout: (make, view) => {
                make.height.equalTo(50)
                make.bottom.left.right.inset(10)
            } // layout
        } // buttonArea

        let memoryArea = {
            type: "view",
            views: [this.answerView.toRender, this.questionView.toRender],
            layout: (make, view) => {
                make.top.left.right.equalTo(view.super)
                make.bottom.equalTo(view.prev.top)
            }
        } // memoryArea

        this.toRender = {
            type: "view",
            views: [buttonArea, memoryArea], // views
            layout: $layout.fill,
            events: {
                ready: sender => {
                    $(this.buttonAreaId).moveToFront()
                    this.resetAndChangeQuestion(callBack.ready())
                }
            }
        } // toRender
    } // constructor

    makeRememberForgetButton(icon_num, icon_color, callBack) {
        return {
            type: "button",
            props: {
                icon: $icon(icon_num, icon_color, $size(40, 40))
            },
            events: {
                tapped: () => {
                    this.resetAndChangeQuestion(callBack())
                } // tapped
            } // events
        } // returned view
    } // rememberForgetButton

    enableButtonArea() {
        $(this.buttonAreaId).userInteractionEnabled = true
        $(this.buttonAreaId).alpha = 1
    }

    disableButtonArea() {
        $(this.buttonAreaId).userInteractionEnabled = false
        $(this.buttonAreaId).alpha = 0.5
    }

    resetAndChangeQuestion(qstAndAsw) {
        if(!qstAndAsw) return
        
        this.disableButtonArea()
        this.revealed = false

        let {contentType, contents} = qstAndAsw
        this.questionView.reset()
        this.questionView.changeContent(contentType, contents[0])
        this.answerView.resetAndChangeContent(contentType, contents[1])
    }

    revealAnswer() {
        this.enableButtonArea()
        this.revealed = true

        this.questionView.moveUp()
        this.answerView.moveDown()
    }
} // class

module.exports = MemoryView