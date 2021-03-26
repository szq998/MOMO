class PopView {
    constructor(id) {
        this.id = id;
        this.innerIds = [];
        this.views = [];
        // if(views) this.addViews(views)

        this.blurId = 'blur_of_' + id;
        this.innerViewId = 'inner_view_of_' + id;
        this.closeId = 'close_indicator_of_' + id;

        let blur = {
            type: 'blur',
            props: {
                id: this.blurId,
                style: $blurStyle.ultraThinMaterial,
                alpha: 0,
            },
            layout: $layout.fill,
        };

        let closeLabel = {
            type: 'label',
            props: {
                id: this.closeId,
                text: '关闭',
                circular: true,
                textColor: $color('white'),
                align: $align.center,
                bgcolor: $color('red'),
                font: $font('bold', 20),
                //autoFontSize: true
                borderWidth: 1,
                borderColor: $color('white'),
            },
            layout: (make, view) => {
                make.size.equalTo($size(70, 40));
                make.centerX.equalTo(view.super);
                make.bottom.equalTo(view.super.top);
            },
        };

        let innerView = {
            type: 'view',
            props: {
                id: this.innerViewId,
                clipsToBounds: true,
            },
            views: this.views,
            layout: (make, view) => {
                make.size.equalTo(view.super);
                make.centerX.equalTo(view.super);
                make.top.equalTo(view.super.bottom);
            },
        };

        this.toRender = {
            type: 'view',
            props: {
                id: id,
                hidden: true,
                clipsToBounds: true,
            },
            layout: $layout.fill,
            views: [blur, closeLabel, innerView],
            events: {
                //                tapped: sender => {
                //                    this.disappear()
                //                },
                touchesBegan: (sender, location) => {
                    let target = $(this.innerViewId);

                    target.info = {
                        whereTouchBegins: location.y,
                        whenTouchBegins: new Date(),
                    };
                },
                touchesMoved: (sender, location) => {
                    let target = $(this.innerViewId);
                    let yOffset = location.y - target.info.whereTouchBegins;
                    target.frame = $rect(
                        0,
                        yOffset / 2,
                        target.size.width,
                        target.size.height
                    );
                    // show self is going to close indicator
                    let rootHeight = $(this.id).size.height;
                    let closeThreshold = rootHeight > 150 ? 150 : rootHeight;
                    if (yOffset > closeThreshold) {
                        this.showCloseIndicator();
                        let indicator = $(this.closeId);
                        let f = indicator.frame;

                        indicator.frame = $rect(
                            f.x,
                            35 + (yOffset - closeThreshold) / 3,
                            f.width,
                            f.height
                        );
                    } else {
                        this.hideCloseIndicator();
                    }
                },
                touchesEnded: (sender, location) => {
                    let rootHeight = $(this.id).size.height;
                    let closeThreshold = rootHeight > 150 ? 150 : rootHeight;

                    let target = $(this.innerViewId);

                    let yOffset = location.y - target.info.whereTouchBegins;
                    let tSpan = new Date() - target.info.whenTouchBegins;
                    let speed = (yOffset / tSpan) * 1000;

                    if (yOffset > closeThreshold) {
                        // disappear
                        this.disappear();

                        let indicator = $(this.closeId);
                        $ui.animate({
                            duration: 0.2,
                            damping: 0.6,
                            animation: () => {
                                indicator.scale(1.5);
                            },
                            completion: () => {
                                $ui.animate({
                                    delay: 0.05,
                                    duration: 0.15,
                                    animation: () => {
                                        indicator.alpha = 0;
                                        indicator.scale(0.3);
                                    },
                                    completion: () => {
                                        indicator.scale(1);
                                        this.hideCloseIndicator();
                                    },
                                });
                            },
                        });
                    } else if (speed > 700) {
                        this.disappear();
                    } else {
                        $ui.animate({
                            duration: 0.4,
                            damping: 0.5,
                            //velocity: speed,
                            animation: () => {
                                target.frame = $rect(
                                    0,
                                    0,
                                    target.size.width,
                                    target.size.height
                                );
                            },
                        });
                    }
                }, // touchesEnded
            }, //events
        }; //toRender
    } //constructor

    doBeforeClose() {}

    doAfterClose() {}

    addViews(views) {
        if ($(this.id)) {
            // not implemented
            $ui.error('Adding views dynamically is not implemented!');
        } else {
            for (const v of views) {
                this.innerIds.push(v.props.id);
                this.views.push(v);
            }
        }
    }

    showCloseIndicator() {
        let indicator = $(this.closeId);
        if (indicator.frame.y != -indicator.size.height) return;
        else {
            $device.taptic(2);
            indicator.alpha = 1;
            let f = indicator.frame;
            $ui.animate({
                damping: 0.4,
                animation: () => {
                    indicator.frame = $rect(f.x, 35, f.width, f.height);
                },
            });
        }
    }

    hideCloseIndicator() {
        let indicator = $(this.closeId);
        if (indicator.frame.y < 35) return;
        else {
            let f = indicator.frame;
            $ui.animate({
                animation: () => {
                    indicator.frame = $rect(f.x, -f.height, f.width, f.height);
                },
            });
        }
    }

    appear() {
        let v = $(this.innerViewId);
        let viewBlur = $(this.blurId);
        let viewRoot = $(this.id);

        v.relayout();

        let rootHeight = viewRoot.size.height;
        let highest = rootHeight;

        for (const id of this.innerIds) {
            if ($(id).frame.y < highest) {
                highest = $(id).frame.y;
            }
        }

        v.frame = $rect(
            0,
            rootHeight - highest /*for better animation*/,
            v.size.width,
            v.size.height
        );

        viewRoot.hidden = false;

        $ui.animate({
            duration: 0.6,
            damping: 0.7,
            animation: () => {
                viewBlur.alpha = 1;
                v.frame = $rect(0, 0, v.size.width, v.size.height);
            },
            completion: () => {
                v.updateLayout((make, view) => {
                    make.size.equalTo(view.super);
                    make.center.equalTo(view.super);
                });
            },
        });
    }

    disappear() {
        this.doBeforeClose();
        //this.hideCloseIndicator();
        //$(this.closeId).hidden = true
        //let that = this;
        let v = $(this.innerViewId);
        let viewBlur = $(this.blurId);
        let viewRoot = $(this.id);

        let rootHeight = viewRoot.size.height;
        let highest = rootHeight;
        for (const id of this.innerIds) {
            if ($(id).frame.y < highest) {
                highest = $(id).frame.y;
            }
        }
        $ui.animate({
            duration: 0.5,
            //damping: 0.5,
            //velocity: 10000,
            //options: 3 << 16,
            animation: () => {
                viewBlur.alpha = 0;
                v.frame = $rect(
                    0,
                    rootHeight - highest /*for better animation*/,
                    v.size.width,
                    v.size.height
                );
            },
            completion: () => {
                viewRoot.hidden = true;
                //alert(highest+","+v.frame.y+","+v.frame.height)
                v.remakeLayout((make, view) => {
                    make.size.equalTo(view.super);
                    make.centerX.equalTo(view.super);
                    make.top.equalTo(view.super.bottom);
                });
                this.doAfterClose();
            }, // completion
        }); // $ui.animate
    } // disappear
} // class

module.exports = PopView;
