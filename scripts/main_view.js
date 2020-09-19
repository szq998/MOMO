const CategoryMenuView = require("./category_menu_view.js")
const MemoryListView = require("./m_list_view.js")

class MainView {
    constructor(id, callBack) {
        this.id = id
        this.callBack = callBack

        this.categoryMenuID = "category_menu_of_" + this.id
        this.memoryListID = "memory_list_of_" + this.id
        this.buttonAreaID = "button_area_of_" + this.id

        let callBackForCMV = {
            mergeCategory: callBack.mergeCategory,
            renameCategory: callBack.renameCategory,
            deleteCategory: callBack.deleteCategory,
            reorderCategory: callBack.reorderCategory,
            getCountByCategory: callBack.getCountByCategory,
            getAllCategories: callBack.getAllCategories,
            inputCategory: MainView.inputCategory,
            doAfterCategoryChanged: this.memoryListView.categoryChanged,
            doAfterCategoryRenamed: this.memoryListView.categoryRenamed,

        }

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
            getCurrentCategory: this.categoryMenuView.getCurrentCategory,
            reloadCategory: this.categoryMenuView.reloadCategory

        }

        this.categoryMenuView = CategoryMenuView(this.categoryMenuID, callBackForCMV, (make, view) => {
            make.top.left.right.equalTo(0)
            make.height.equalTo(40)
        })
        this.memoryListView = MemoryListView(this.memoryListID, callBackForMLV, (make, view) => {
            make.top.equalTo(view.prev.bottom)
            make.left.bottom.right.equalTo(0)
        })
        let buttonArea = this.makeButtonArea((make, view) => {
            make.height.equalTo(50)
            make.bottom.left.right.inset(15)
        })

        this.toRender = {
            type: "view",
            props: { bgcolor: $color("#F2F1F6", "primarySurface") },
            views: [buttonArea, this.categoryMenuView.toRender, ths.memoryListView.toRender],
            layout: $layout.fill
        }


    }

    makeButtonArea(layout) {
        return {
            type: "stack",
            props: {
                id: this.buttonAreaID,
                axis: $stackViewAxis.horizontal,
                spacing: 20,
                distribution: $stackViewDistribution.fillEqually,
                stack: {
                    views: [
                        this.makeButton("开始记忆", this.callBack.startMemory),
                        this.makeButton("添加记录", this.callBack.addMemory)
                    ] // views
                } // stack
            }, // props
            layout: layout
        }
    } // buttonArea

    makeButton(text, callBack) {
        return {
            type: "button",
            props: { title: text },
            events: { tapped: callBack } // events
        } // returned view
    }

    static async inputCategory() {
        let text = await $input.text({ placeholder: "输入新类别名" })
        if (text && text.trim()) {
            let targetCtgy = text.trim()
            if (targetCtgy.length > MAX_CATEGORY_LEN) {
                $ui.warning("类别名称过长")
                return false
            } else return targetCtgy
        } else return false
    }
    
    static async inputDescription() {
        let text = await $input.text({ placeholder: "输入新描述" })
        if (text && text.trim()) {
            let newDesc = text.trim()
            if (newDesc.length < MIN_DESC_LEN) {
                $ui.warning("类别名称过长")
                return false
            } else return newDesc
        } else return false
    }

    getCurrentCategory() {
        return this.categoryMenuView.getCurrentCategory()
    }

    refreshMemoryList() {
        this.memoryListView.refreshMemoryList()
    }
} // class

module.exports = MainView