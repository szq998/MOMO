class LinkList {
    constructor(items) {
        this.list = new Array(items.length)

        for (let i = 0; i < items.length; ++i) {
            this.list[i] = {
                data: items[i],
                prev: i - 1 < 0 ? items.length - 1 : i - 1,
                next: i + 1 > items.length - 1 ? 0 : i + 1,

                deleted: false
            }
        } // for
    } // constructor

    getNextItem(LItem) {
        return this.list[LItem.next]
    }
    getPrevItem(LItem) {
        return this.list[LItem.prev]
    }
    deleteItem(LItem) {
        LItem.deleted = true
        this.list[LItem.prev].next = LItem.next
        this.list[LItem.next].prev = LItem.prev
        let nextLItem = this.list[LItem.next]
        if (nextLItem.deleted) return undefined
        return nextLItem
    }
} // class

class MemoryModel {
    constructor(memoryDB, callBack) {
        this.memoryDB = memoryDB
        this.callBack = callBack

        this.memoryList
        this.currLItem
    } // constructor

    start(mSnapshots) {
        if (!mSnapshots.length) return

        let memoryItems = new Array(mSnapshots.length)
        mSnapshots.forEach((item, index) => {
            memoryItems[index] = {
                id: item.id,
                type: item.type,
                description: item.description,
                degree: item.degree,

                isQuestioned: false,
                consecutiveRememberedTime: 0
            }
        })

        this.memoryList = new LinkList(memoryItems)
        this.currLItem = this.memoryList.list[0]

        console.log("get " + memoryItems.length + " memory snapshot(s)")
    }

    remember() {
        let nextLItem
        if (this.currLItem.data.isQuestioned) {
            this.currLItem.data.consecutiveRememberedTime += 1
            console.log(
                this.getCurrentId() +
                " remember not at once, consecutiveRememberedTime is " +
                this.currLItem.data.consecutiveRememberedTime
            )
            if (this.currLItem.data.consecutiveRememberedTime == 3) {
                // update database
                this.memoryDB.forgetUpdate(this.getCurrentId())
                // delete from memoryList
                nextLItem = this.memoryList.deleteItem(this.currLItem)
            } else {
                nextLItem = this.memoryList.getNextItem(this.currLItem)
            }
        } else {
            console.log(this.getCurrentId() + " remember at once")
            // update database
            this.memoryDB.rememberUpdate(this.getCurrentId())
            // delete from memoryList
            nextLItem = this.memoryList.deleteItem(this.currLItem)
        }
        if (nextLItem == undefined) {
            // finish
            console.log("all remembered")
            this.callBack.finish()
        }
        this.currLItem = nextLItem
    } // remember

    forget() {
        console.log(
            this.getCurrentId() +
            " forget, last consecutiveRememberedTime is " +
            this.currLItem.data.consecutiveRememberedTime
        )
        if (this.currLItem.data.isQuestioned) {
            this.currLItem.data.consecutiveRememberedTime = 0
        } else {
            this.currLItem.data.isQuestioned = true
        }

        this.currLItem = this.memoryList.getNextItem(this.currLItem)
    } // forget

    getCurrentSnapshots() {
        return this.currLItem ? this.currLItem.data : undefined
    }

    getCurrentId() {
        return this.currLItem ? this.currLItem.data.id : undefined
    }

    getCurrentType() {
        return this.currLItem ? this.currLItem.data.type : undefined
    }

    getCurrentDescription() {
        return this.currLItem ? this.currLItem.data.description : undefined
    }

    getCurrentDegree() {
        return this.currLItem ? this.currLItem.data.degree : undefined
    }
} // class

module.exports = MemoryModel
