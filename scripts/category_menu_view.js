class CategoryMenuView{
    constructor(id, callBack, layout) {
        this.id = id
        this.callBack = callBack

        this.toRender = {
            type: "menu",
            props: {
                id: this.id,
                items: ["全部"].concat(this.callBack.getAllCategories()),
                // dynamicWidth: true   waiting for fix of jsbox
            },
            layout: layout, 
            events: {
                changed: sender => {
                    this.callBack.doAfterCategoryChanged()
                },
                longPressed: info => {
                    let sender = info.sender
                    $ui.popover({
                        sourceView: sender,
                        views: [this.makeCategoryEditView()]
                    })
                } // longPressed
            } // events
        }
    } // constructor

    makeCategoryEditView() {
        let reorderSrcIdx
        let reorderDstIdx

        let allCtgy = this.callBack.getAllCategories()
        if (allCtgy.length) {
            let template = {
                props: { bgcolor: $color("clear") },
                views: [
                    {
                        type: "label",
                        props: { id: "label", align: $align.center },
                        layout: $layout.fill
                    }
                ]
            } // template

            let actions = [
                {
                    title: "删除",
                    color: $color("red"), // default to gray
                    handler: (sender, indexPath) => {
                        this.deleteCategory(sender, indexPath)
                    }
                },
                {
                    title: "重命名",
                    handler: (sender, indexPath) => {
                        this.renameCategoty(sender, indexPath)
                    }
                },
                {
                    title: "合并到...",
                    handler: (sender, indexPath) => {
                        this.mergeCategory(sender, indexPath)
                    }
                }
            ]

            return {
                type: "list",
                props: {
                    bgcolor: $color("tertiarySurface"),
                    separatorColor: $color("separatorColor", "darkGray"),
                    reorder: true,
                    data: allCtgy.map(ctg => {
                        return { label: { text: ctg } }
                    }),
                    template: template,
                    actions: actions
                },
                layout: $layout.fill,
                events: {
                    reorderBegan: indexPath => {
                        reorderSrcIdx = indexPath.row
                        reorderDstIdx = indexPath.row
                    },
                    reorderMoved: (fromIndexPath, toIndexPath) => {
                        reorderDstIdx = toIndexPath.row
                    },
                    reorderFinished: data => {
                        this.reorderCategory(reorderSrcIdx, reorderDstIdx)
                    } // reorderFinished
                } // events
            } // return
        } else {
            return {
                type: "label",
                props: { text: "无内容", bgcolor: $color("tertiarySurface"), align: $align.center },
                layout: $layout.fill
            }
        }
    } // makeCategoryEditView

    async deleteCategory(sender, indexPath) {
        let ctgy = sender.data[indexPath.row].label.text
        let count = this.callBack.getCountByCategory(ctgy)

        let isDelete = true
        if (count) {
            let deleteAction = await $ui.alert({
                title: "确认删除？",
                message: "该类别下有" + count + "条记录",
                actions: [
                    { title: "取消", style: 1 },
                    { title: "确认", style: 2 }
                ]
            })
            isDelete = deleteAction.index
        }
        if (isDelete) {
            let oldCtgy = this.callBack.getAllCategories()
            this.callBack.deleteCategory(ctgy)
            let newCtgy = this.callBack.getAllCategories()

            // change category list
            sender.delete(indexPath)
            // change main list
            this.categoryRemoved(oldCtgy, newCtgy)
        }
    }

    async renameCategoty(sender, indexPath) {
        let oldName = sender.data[indexPath.row].label.text
        let newName = await this.callBack.inputCategory(oldName)
        if (newName)
            if (this.callBack.renameCategory(oldName, newName)) {
                // change category list
                sender.delete(indexPath)
                sender.insert({
                    indexPath: indexPath,
                    value: { label: { text: newName } }
                })
                // change main list
                this.callBack.doAfterCategoryRenamed(oldName, newName)
                // change category menu
                this.reloadCategory()
            } else $ui.warning("重命名失败，可能与已有名称重复")
    }

    async mergeCategory(sender, indexPath) {
        let srcCtgy = sender.data[indexPath.row].label.text
        let targets = this.callBack.getAllCategories()
        targets.splice(targets.indexOf(srcCtgy), 1)
        if (!targets.length) {
            $ui.warning("无可合并的目标")
            return
        }
        let selected = await $picker.data({
            props: {
                items: [targets]
            }
        })

        if (selected) {
            let dstCtgy = selected[0]
            let oldCtgy = this.callBack.getAllCategories()
            this.callBack.mergeCategory(srcCtgy, dstCtgy)
            let newCtgy = this.callBack.getAllCategories()
            // change category list
            sender.delete(indexPath)
            // change category menu
            this.categoryRemoved(oldCtgy, newCtgy, dstCtgy)
            // change main list
            if (this.getCurrentCategory() == dstCtgy) {
                this.callBack.doAfterCategoryChanged()
            }
        }
    }

    reorderCategory(reorderSrcIdx, reorderDstIdx) {
        if (reorderSrcIdx != reorderDstIdx) {
            let allCtgy = this.callBack.getAllCategories()
            // change main list
            let currCtgy = this.getCurrentCategory()
            if (currCtgy) {
                let currIdx = allCtgy.indexOf(currCtgy)
                if (currIdx == reorderSrcIdx)
                    $(this.id).index = reorderDstIdx + 1
                else if (reorderSrcIdx < reorderDstIdx && currIdx > reorderSrcIdx && currIdx <= reorderDstIdx)
                    $(this.id).index = currIdx + 1 - 1 // consider 全部
                else if (reorderSrcIdx > reorderDstIdx && currIdx < reorderSrcIdx && currIdx >= reorderDstIdx)
                    $(this.id).index = currIdx + 1 + 1 // consider 全部
            }
            // update database
            let srcCtgy = allCtgy[reorderSrcIdx]
            let dstCtgy = allCtgy[reorderDstIdx]
            this.callBack.reorderCategory(srcCtgy, dstCtgy)
            // change category menu
            this.reloadCategory()
        }
    } // reorderCategory

    categoryRemoved(oldCtgy, newCtgy, backTo = null) {
        // let oldCtgy = $(this.categoryMenuId).items
        // oldCtgy.unshift() // 全部
        let curr = this.getCurrentCategory()
        let currIdx = oldCtgy.indexOf(curr)
        // let newCtgy = this.callBack.getAllCategories()
        if (oldCtgy.length == newCtgy.length) return // no deletion
        // $(this.categoryMenuId).items = ["全部"].concat(newCtgy)
        if (!curr) { // 当前在 全部
            this.reloadCategory()
            this.callBack.doAfterCategoryChanged()
            return
        }

        let i = 0
        let idxDec = 0
        for (const j in oldCtgy) {
            if (oldCtgy[j] != newCtgy[i]) {
                // ctgy is deleted
                if (currIdx > j) ++idxDec
                else if (currIdx == j) {
                    // this.switchToCategory(backTo)
                    this.reloadCategory()
                    this.changeToCategory(backTo)
                    this.callBack.doAfterCategoryChanged()
                    return
                }
            } else ++i
        }
        currIdx -= idxDec
        currIdx++ // 全部

        this.reloadCategory()
        $(this.id).index = currIdx
    }

    reloadCategory() {
        let newCtgy = this.callBack.getAllCategories()
        newCtgy.unshift("全部")
        $(this.id).items = newCtgy
    }

    getCurrentCategory() {
        let index = $(this.id).index
        if (index > 0) return $(this.id).items[index]
        else return null
    }

    changeToCategory(ctgy) {
        if (!ctgy) $(this.id).index = 0
        else {
            let allCtgy = $(this.id).items
            let index = allCtgy.indexOf(ctgy)
            if (index == -1) {
                console.error("Error: category not found.")
                return
            }
            $(this.id).index = index
        }
    }

    // switchToCategory(ctgy) {
    //     // let newCtgy = this.callBack.getAllCategories()
    //     // newCtgy.unshift("全部")
    //     // this.reloadCategoryMenu()
    //     let allCtgy = $(this.categoryMenuId).items
    //     let index = ctgy ? allCtgy.indexOf(ctgy) : 0
    //     if (index == -1) {
    //         console.error("Error: category not found.")
    //         return
    //     }

    //     // $(this.categoryMenuId).items = newCtgy
    //     $(this.categoryMenuId).index = index
    //     this.callBack.doAfterCategoryChanged()
    // }

} // class

module.exports = CategoryMenuView