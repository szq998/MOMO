let ContentView = require('./content_view.js');

const CONTENT_WIDTH = 400;
const CONTENT_HEIGHT_WIDTH_RATIO = 2 / 3;

const CLOSE_THRESHOLD = 80;

class MovableContentView extends ContentView {
    constructor(id) {
        super(id);

        this.layoutForSize = (make, view) => {
            make.width.equalTo(CONTENT_WIDTH);
            make.width.lessThanOrEqualTo(view.super.width).offset(-30);
            make.height
                .equalTo(view.width)
                .multipliedBy(CONTENT_HEIGHT_WIDTH_RATIO);
        };

        this.initialLayout = (make, view) => {
            this.layoutForSize(make, view);
            make.center.equalTo(view.super);
        };

        this.setProps('cornerRadius', 10);
        this.setProps('borderWidth', 1);
        this.setProps('borderColor', $color('lightGray', 'darkGray'));
    } // constructor

    reset() {
        $ui.animate({
            animation: () => {
                $(this.id).remakeLayout(this.initialLayout);
                $(this.id).relayout();
            },
        });
    } // reset
} // class ContentView

class QuestionView extends MovableContentView {
    constructor(id) {
        super(id);

        this.revealedLayout = (make, view) => {
            this.layoutForSize(make, view);

            make.centerX.equalTo(view.super);
            make.bottom.equalTo(view.super.centerY).offset(-10);
        };
    } // constructor

    moveUp() {
        $ui.animate({
            damping: 0.7,
            animation: () => {
                $(this.id).remakeLayout(this.revealedLayout);
                $(this.id).relayout();
            },
        });
    } // moveUp
} // class QuestionView

class AnswerView extends MovableContentView {
    constructor(id) {
        super(id);
        this.answerBlurId = 'blur_of_' + id;

        this.revealedLayout = (make, view) => {
            this.layoutForSize(make, view);

            make.centerX.equalTo(view.super);
            make.top.equalTo(view.super.centerY).offset(10);
        };

        let answerBlur = {
            type: 'blur',
            props: {
                id: this.answerBlurId,
                style: $blurStyle.ultraThinMaterial,
                alpha: 0,
            },
            layout: $layout.fill,
        };

        this.toRender.views.push(answerBlur);

        this.markdownView.props.userInteractionEnabled = true;
    } // constructor

    moveDown() {
        $ui.animate({
            damping: 0.7,
            animation: () => {
                $(this.answerBlurId).alpha = 0;
                $(this.id).remakeLayout(this.revealedLayout);
                $(this.id).relayout();
            },
        });
    } // moveDown

    resetAndChangeContent(contentType, content) {
        this.reset();
        $ui.animate({
            duration: 0.2,
            animation: () => {
                $(this.answerBlurId).alpha = 1;
            },
            completion: () => {
                this.changeContent(contentType, content);
            },
        });
    }
} // class AnswerView

class MemoryView {
    constructor(id, callBack) {
        this.callBack = callBack;

        this.revealed = false;
        this.loadNo = 0;

        this.qViewId = 'qv';
        this.aViewId = 'av';
        this.questionView = new QuestionView(this.qViewId);
        this.answerView = new AnswerView(this.aViewId);
        this.buttonAreaId = 'button_area_of_' + id;
        this.loadingIndicatorId = 'loading_indicator_' + id;

        this.setCardTouchEvents();

        let buttonArea = this.makeButtonArea();
        let memoryArea = this.makeMemoryArea();

        this.toRender = {
            type: 'view',
            views: [buttonArea, memoryArea], // views
            layout: $layout.fill,
            events: {
                ready: (sender) => {
                    $(this.buttonAreaId).moveToFront();

                    callBack.ready();
                    this.tryNext();
                },
            },
        }; // toRender
    } // constructor

    setCardTouchEvents() {
        this.questionView.setEvents('touchesBegan', (sender, location) => {
            if (!this.revealed)
                sender.info = {
                    whereTouchBegan: location.y,
                    initialQPos: $(this.qViewId).frame.y,
                    initialAPos: $(this.aViewId).frame.y,
                    needTaptic: true,
                };
        }); // touchesBegan
        this.questionView.setEvents('touchesMoved', (sender, location) => {
            if (!this.revealed) {
                // change position
                let targetQ = $(this.qViewId);
                let targetA = $(this.aViewId);
                let offset = location.y - sender.info.whereTouchBegan;
                if (-offset > CLOSE_THRESHOLD && sender.info.needTaptic) {
                    let newInfo = sender.info;
                    newInfo.needTaptic = false;
                    sender.info = newInfo;
                    $device.taptic(2);
                }
                if (-offset < CLOSE_THRESHOLD) {
                    let newInfo = sender.info;
                    newInfo.needTaptic = true;
                    sender.info = newInfo;
                }
                targetQ.frame = $rect(
                    targetQ.frame.x,
                    sender.info.initialQPos + offset / 2,
                    targetQ.size.width,
                    targetQ.size.height
                );
                targetA.frame = $rect(
                    targetA.frame.x,
                    sender.info.initialAPos - offset / 2,
                    targetA.size.width,
                    targetA.size.height
                );
            } // if revealed
        }); // touchesMoved
        this.questionView.setEvents('touchesEnded', (sender, location) => {
            if (!this.revealed) {
                if (
                    sender.info.whereTouchBegan - location.y >
                    CLOSE_THRESHOLD
                ) {
                    this.revealAnswer();
                } else {
                    sender.userInteractionEnabled = false;
                    $ui.animate({
                        damping: 0.6,
                        animation: () => {
                            let targetQ = $(this.qViewId);
                            let targetA = $(this.aViewId);

                            targetQ.frame = $rect(
                                targetQ.frame.x,
                                sender.info.initialQPos,
                                targetQ.size.width,
                                targetQ.size.height
                            );
                            targetA.frame = $rect(
                                targetA.frame.x,
                                sender.info.initialAPos,
                                targetA.size.width,
                                targetA.size.height
                            );
                        }, // animation
                        completion: () => {
                            sender.userInteractionEnabled = true;
                        },
                    }); // $ui.animate
                } // if - else
            } // if revealed
        }); // touchesEnded
    }

    makeLoadingIndicator() {
        return {
            type: 'blur',
            props: {
                id: this.loadingIndicatorId,
                hidden: true,
                cornerRadius: 8,
                style: $blurStyle.ultraThinMaterial,
            },
            layout: (make, view) => {
                make.center.equalTo(view.super);
                make.size.equalTo($size(100, 100));
            },
            views: [
                {
                    type: 'spinner',
                    props: {
                        loading: true,
                    },
                    layout: (make, view) => {
                        make.centerX.equalTo(view.super);
                        make.centerY.equalTo(view.super).offset(-20);
                    },
                },
                {
                    type: 'label',
                    props: {
                        text: '加载中...',
                        font: $font(12),
                    },
                    layout: (make, view) => {
                        make.centerX.equalTo(view.super);
                        make.top.equalTo(view.prev.bottom).offset(5);
                    },
                },
                {
                    type: 'button',
                    props: {
                        title: '跳过',
                        font: $font(12),
                        type: 1,
                    },
                    layout: (make, view) => {
                        make.centerX.equalTo(view.super);
                        make.top.equalTo(view.prev.bottom).offset(5);
                    },
                    events: {
                        tapped: () => {
                            this.loadNo++;
                            this.skip();
                            // hide self
                            this.hideLoadingIndicator();
                        },
                    },
                },
            ],
        };
    }

    makeMemoryArea() {
        let loadingIndicator = this.makeLoadingIndicator();

        return {
            type: 'view',
            views: [
                this.answerView.toRender,
                this.questionView.toRender,
                loadingIndicator,
            ],
            layout: (make, view) => {
                make.top.left.right.equalTo(view.super);
                make.bottom.equalTo(view.prev.top);
            },
        }; // memoryArea
    }

    makeButtonArea() {
        return {
            type: 'stack',
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
                            '103',
                            $color('green'),
                            this.callBack.remember
                        ),
                        this.makeRememberForgetButton(
                            '119',
                            $color('yellow'),
                            this.callBack.forget
                        ),
                    ], // views
                }, // stack
            }, // props
            layout: (make, view) => {
                make.height.equalTo(50);
                make.bottom.left.right.inset(10);
            }, // layout
        }; // buttonArea
    }

    makeRememberForgetButton(icon_num, icon_color, callBack) {
        return {
            type: 'button',
            props: {
                icon: $icon(icon_num, icon_color, $size(40, 40)),
            },
            events: {
                tapped: () => {
                    callBack();
                    this.tryNext();
                }, // tapped
            }, // events
        }; // returned view
    } // rememberForgetButton

    enableButtonArea() {
        $(this.buttonAreaId).userInteractionEnabled = true;
        $(this.buttonAreaId).alpha = 1;
    }

    disableButtonArea() {
        $(this.buttonAreaId).userInteractionEnabled = false;
        $(this.buttonAreaId).alpha = 0.5;
    }

    showNextContent(mem) {
        let { type, question, answer } = mem;
        this.questionView.reset();
        this.questionView.changeContent((type >> 0) & 1, question);
        this.answerView.resetAndChangeContent((type >> 1) & 1, answer);
    }

    skip() {
        this.callBack.skip();
        this.tryNext();
    }

    tryNext() {
        this.disableButtonArea();
        this.revealed = false;

        // schedule loading indicator
        let loadingStartTime = null;
        const scheduledLoadingIndicator = setTimeout(() => {
            this.showLoadingIndicator();
            loadingStartTime = Date.now();
        }, 200);

        const currNo = this.loadNo;
        this.callBack.getContent().then(
            (mem) => {
                if (currNo !== this.loadNo) return;

                elegantlyFinishLoading(
                    scheduledLoadingIndicator,
                    loadingStartTime,
                    500,
                    this.showNextContent.bind(this, mem),
                    this.hideLoadingIndicator.bind(this)
                );
            },
            (err) => {
                if (currNo !== this.loadNo) return;

                console.error('Failed to get memory resources.');
                console.error(err);

                elegantlyFinishLoading(
                    scheduledLoadingIndicator,
                    loadingStartTime,
                    500,
                    this.showLoadingFailedAlert.bind(this),
                    this.hideLoadingIndicator.bind(this)
                );
            }
        );
    }

    revealAnswer() {
        this.enableButtonArea();
        this.revealed = true;

        this.questionView.moveUp();
        this.answerView.moveDown();
    }

    showLoadingIndicator() {
        $(this.loadingIndicatorId).hidden = false;
    }

    hideLoadingIndicator() {
        $(this.loadingIndicatorId).hidden = true;
    }

    showLoadingFailedAlert() {
        $ui.alert({
            title: '加载失败',
            message: '无法从iCloud下载资源，检查你的网络连接。',
            actions: [
                {
                    title: '重试',
                    style: $alertActionType.default, // Optional
                    handler: () => {
                        this.tryNext();
                    },
                },
                {
                    title: '跳过',
                    handler: () => {
                        this.skip();
                    },
                },
                {
                    title: '结束',
                    style: $alertActionType.destructive, // Optional
                    handler: () => {
                        $ui.pop();
                    },
                },
            ],
        });
    }
} // class

// make sure loading indicator will not flash
function elegantlyFinishLoading(
    scheduled,
    appearTime,
    leastDuration,
    callBackWhenFinished,
    callBackToStopLoading
) {
    if (appearTime) {
        const lastingTime = Date.now() - appearTime;
        const remainingTime =
            leastDuration - lastingTime < 0 ? 0 : leastDuration - lastingTime;
        setTimeout(() => {
            callBackToStopLoading();
            callBackWhenFinished();
        }, remainingTime);
    } else {
        clearTimeout(scheduled);
        callBackWhenFinished();
    }
}

module.exports = MemoryView;
