const CategoryMenuView = require('./category_menu_view.js');
const MemoryListView = require('./memory_list_view.js');

const MIN_DESC_LEN = 5;
const MAX_CATEGORY_LEN = 10;

class MainView {
    constructor(id, callBack) {
        this.id = id;
        this.callBack = callBack;

        this.loadingCancelHandler = null;

        this.categoryMenuID = 'category_menu_of_' + this.id;
        this.memoryListID = 'memory_list_of_' + this.id;
        this.buttonAreaID = 'button_area_of_' + this.id;
        this.loadingIndicatorID = 'loading_indicator_of_' + this.id;

        let callBackForCMV = {
            mergeCategory: callBack.mergeCategory,
            renameCategory: callBack.renameCategory,
            deleteCategory: callBack.deleteCategory,
            reorderCategory: callBack.reorderCategory,
            getCountByCategory: callBack.getCountByCategory,
            getAllCategories: callBack.getAllCategories,
            inputCategory: MainView.inputCategory,
        };

        let callBackForMLV = {
            loadResource: callBack.loadResource,
            getMemoryByPage: callBack.getMemoryByPage,
            changeContentById: callBack.changeContentById,
            changeCategoryById: callBack.changeCategoryById,
            changeDescriptionById: callBack.changeDescriptionById,
            deleteById: callBack.deleteById,
            addCategory: callBack.addCategory,
            getAllCategories: callBack.getAllCategories,
            inputCategory: MainView.inputCategory,
            inputDescription: MainView.inputDescription,
            showLoadingIndicator: this.showLoadingIndicator.bind(this),
            hideLoadingIndicator: this.hideLoadingIndicator.bind(this),
            enableInteraction: this.enableInteraction.bind(this),
            disableInteraction: this.disableInteraction.bind(this),
        };

        this.categoryMenuView = new CategoryMenuView(
            this.categoryMenuID,
            callBackForCMV,
            (make, view) => {
                make.top.left.right.equalTo(0);
                make.height.equalTo(40);
            }
        );
        this.memoryListView = new MemoryListView(
            this.memoryListID,
            callBackForMLV,
            (make, view) => {
                make.top.equalTo(view.prev.bottom);
                make.left.bottom.right.equalTo(0);
                // make.bottom.equalTo(view.prev.prev.top)
            }
        );

        // set relational callback
        callBackForCMV.doAfterCategorySwitched = () => {
            this.memoryListView.categorySwitched();
        };
        callBackForCMV.doAfterCategoryRenamed = () => {
            this.memoryListView.categoryRenamed();
        };

        callBackForMLV.getCurrentCategory = () => {
            return this.categoryMenuView.getCurrentCategory();
        };
        callBackForMLV.reloadCategory = () => {
            this.categoryMenuView.reloadCategory();
        };

        let buttonArea = this.makeButtonArea((make, view) => {
            make.height.equalTo(50);
            make.bottom.left.right.inset(15);
        });

        let loadingIndicator = this.makeLoadingIndicator();

        this.toRender = {
            type: 'view',
            props: { bgcolor: $color('#F2F1F6', 'primarySurface') },
            views: [
                this.categoryMenuView.toRender,
                this.memoryListView.toRender,
                buttonArea,
                loadingIndicator,
            ],
            layout: $layout.fillSafeArea,
        };
    }

    makeButtonArea(layout) {
        return {
            type: 'stack',
            props: {
                id: this.buttonAreaID,
                axis: $stackViewAxis.horizontal,
                spacing: 20,
                distribution: $stackViewDistribution.fillEqually,
                stack: {
                    views: [
                        this.makeButton('开始记忆', this.callBack.startMemory),
                        this.makeButton('添加记录', () => {
                            this.addMemory();
                        }),
                    ], // views
                }, // stack
            }, // props
            layout: layout,
        };
    } // buttonArea

    makeButton(text, callBack) {
        return {
            type: 'button',
            props: { title: text },
            events: { tapped: callBack }, // events
        }; // returned view
    }

    makeLoadingIndicator() {
        return {
            type: 'blur',
            props: {
                id: this.loadingIndicatorID,
                hidden: true,
                cornerRadius: 8,
                style: $blurStyle.ultraThinMaterial,
            },
            layout: (make, view) => {
                make.centerX.equalTo(view.super);
                make.centerY.equalTo(view.super).offset(-40);
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
                        title: '取消',
                        font: $font(12),
                        type: 1,
                    },
                    layout: (make, view) => {
                        make.centerX.equalTo(view.super);
                        make.top.equalTo(view.prev.bottom).offset(5);
                    },
                    events: {
                        tapped: () => {
                            // hide self
                            if (this.loadingCancelHandler) {
                                this.loadingCancelHandler();
                            }
                            this.hideLoadingIndicator();
                        },
                    },
                },
            ],
        };
    }

    static async inputCategory(oldCtgy = '') {
        let text = await $input.text({
            text: oldCtgy,
            placeholder: '输入新类别名',
        });
        if (text && text.trim()) {
            let newCtgy = text.trim();
            if (newCtgy.length > MAX_CATEGORY_LEN) {
                $ui.warning('类别名称过长');
                return false;
            } else return newCtgy;
        } else return false;
    }

    static async inputDescription(oldDesc = '') {
        let text = await $input.text({
            text: oldDesc,
            placeholder: '输入新描述',
        });
        if (text && text.trim()) {
            let newDesc = text.trim();
            if (newDesc.length < MIN_DESC_LEN) {
                $ui.warning('类别名称过短');
                return false;
            } else return newDesc;
        } else return false;
    }

    addMemory() {
        this.callBack.addMemory().then((ctgy) => {
            let currListCtgy = this.categoryMenuView.getCurrentCategory();
            if (!currListCtgy || currListCtgy == ctgy) {
                this.memoryListView.refreshMemoryList();
            }
            this.categoryMenuView.reloadCategory();
        });
    }

    getCurrentCategory() {
        return this.categoryMenuView.getCurrentCategory();
    }

    refreshMemoryList() {
        this.memoryListView.refreshMemoryList();
    }

    showLoadingIndicator(cancelHandler) {
        $(this.loadingIndicatorID).hidden = false;
        if (cancelHandler) {
            this.loadingCancelHandler = cancelHandler;
        }
    }

    hideLoadingIndicator() {
        $(this.loadingIndicatorID).hidden = true;
        this.loadingCancelHandler = null;
    }

    disableInteraction() {
        $(this.categoryMenuID).userInteractionEnabled = false;
        $(this.memoryListID).userInteractionEnabled = false;
        $(this.buttonAreaID).userInteractionEnabled = false;
    }

    enableInteraction() {
        $(this.categoryMenuID).userInteractionEnabled = true;
        $(this.memoryListID).userInteractionEnabled = true;
        $(this.buttonAreaID).userInteractionEnabled = true;
    }
} // class

module.exports = MainView;
