const CategoryMenuView = require('./category_menu_view.js');
const MemoryListView = require('./memory_list_view.js');

const MIN_DESC_LEN = 5;
const MAX_CATEGORY_LEN = 10;

class MainView {
    constructor(id, callBack) {
        this.id = id;
        this.callBack = callBack;

        this.categoryMenuID = 'category_menu_of_' + this.id;
        this.memoryListID = 'memory_list_of_' + this.id;
        this.buttonAreaID = 'button_area_of_' + this.id;

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
            getMemoryByPage: callBack.getMemoryByPage,
            changeContentById: callBack.changeContentById,
            changeCategoryById: callBack.changeCategoryById,
            changeDescriptionById: callBack.changeDescriptionById,
            deleteById: callBack.deleteById,
            addCategory: callBack.addCategory,
            getAllCategories: callBack.getAllCategories,
            inputCategory: MainView.inputCategory,
            inputDescription: MainView.inputDescription,
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
        callBackForCMV.doAfterCategoryChanged = () => {
            this.memoryListView.categoryChanged();
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

        this.toRender = {
            type: 'view',
            props: { bgcolor: $color('#F2F1F6', 'primarySurface') },
            views: [
                this.categoryMenuView.toRender,
                this.memoryListView.toRender,
                buttonArea,
            ],
            layout: $layout.fill,
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
} // class

module.exports = MainView;
