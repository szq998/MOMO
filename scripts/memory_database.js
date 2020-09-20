const NEWLY_ADDED_TIME = 0

class MemoryDatabase {
    constructor(dbPath) {
        this.db = $sqlite.open(dbPath)
    }

    static createMemoryDatabase(dbPath) {
        let db = $sqlite.open(dbPath)
        db.update(
            `CREATE TABLE Memory(
            id integer primary key, 
            type integer not null, 
            category integer not null, 
            description text not null, 
            time integer not null, 
            remembered integer not null, 
            degree integer not null)`
        )
        db.update(
            `CREATE TABLE Category(
             id integer primary key AUTOINCREMENT, 
             name text not null, 
             corder integer not null)`
        )

        db.close()
        return new MemoryDatabase(dbPath)
    }

    close() {
        this.db.close()
    }

    addCategory(categoryName) {
        let dup = this.db.query({
            sql: "SELECT * FROM Category WHERE name=?",
            args: [categoryName]
        }).result

        if (dup.next()) return false

        let nextOrd
        this.db.query("SELECT corder FROM Category ORDER BY corder DESC LIMIT 1", (rs, er) => {
            if (rs) {
                if (rs.next()) nextOrd = rs.values.corder + 1
                else nextOrd = 0
            }
        })
        this.db.update({
            sql: "INSERT INTO Category values(?, ?, ?)",
            args: [null, categoryName, nextOrd]
        })
        return true
    }

    getAllCategories() {
        let sql = "SELECT name FROM Category ORDER BY corder ASC "

        let categories = []
        this.db.query(sql, (rs, er) => {
            while (rs.next()) {
                categories.push(rs.values.name)
            }
        })
        return categories
    }

    getCategoryNameById(categoryId) {
        let name
        this.db.query(
            {
                sql: "SELECT name FROM Category WHERE id=?",
                args: [categoryId]
            },
            (rs, er) => {
                if (rs && rs.next()) name = rs.values.name
            }
        )
        return name
    }

    getCategoryIdByName(categoryName) {
        let id
        this.db.query(
            {
                sql: "SELECT id FROM Category WHERE name=?",
                args: [categoryName]
            },
            (rs, er) => {
                if (rs && rs.next()) id = rs.values.id
            }
        )
        return id
    }

    getNewlyAddedMemory(categoryName = null) {
        let memory = []
        // query newly add memoryif
        let sql =
            "SELECT Memory.*, Category.name \
             FROM Memory INNER JOIN Category \
             ON Memory.category == Category.id \
             WHERE time=? "
        let args = [NEWLY_ADDED_TIME]
        if (categoryName) {
            let categoryId = this.getCategoryIdByName(categoryName)
            if (typeof categoryId != "number") {
                console.error("Error: no such category name in database.")
                return []
            }

            sql += " AND category=?"
            args.push(categoryId)
        }

        this.db.query(
            {
                sql: sql,
                args: args
            },
            (rs, er) => {
                while (rs.next()) {
                    let values = rs.values
                    values.category = values.name
                    delete values.name
                    memory.push(values)
                }
            }
        )
        return memory
    }

    getMemory(
        pageNo,
        pageSize,
        categoryName = null,
        isNewlyAddedIncluded = true
    ) {
        let memory = []

        let sql =
            "SELECT Memory.*, Category.name \
             FROM Memory INNER JOIN Category \
             ON Memory.category == Category.id"
        let args = []
        if (!isNewlyAddedIncluded) {
            sql += " WHERE time!=? "
            args.push(NEWLY_ADDED_TIME)
        }
        if (categoryName) {
            let categoryId = this.getCategoryIdByName(categoryName)
            if (typeof categoryId != "number") {
                console.error("Error: no such category name in database.")
                return []
            }

            sql += " AND category=? "
            args.push(categoryId)
        }

        sql += " ORDER BY remembered ASC, degree ASC, time ASC LIMIT ? OFFSET ?"
        args = args.concat([pageSize, pageNo * pageSize])

        this.db.query(
            {
                sql: sql,
                args: args
            },
            (rs, er) => {
                while (rs.next()) {
                    let values = rs.values
                    values.category = values.name
                    delete values.name
                    memory.push(values)
                }
            }
        ) // query
        return memory
    }

    getMemoryById(id) {
        let mem
        this.db.query(
            {
                sql:
                    "SELECT Memory.*, Category.name \
                     FROM Memory INNER JOIN Category \
                     ON Memory.category == Category.id \
                     WHERE Memory.id=?",
                args: [id]
            },
            (rs, er) => {
                if (rs && rs.next()) {
                    mem = rs.values
                    mem.category = mem.name
                    delete mem.name
                }
            }
        )
        return mem
    }

    getMostForgetableMemorySnapshots(num, category = null) {
        let sql = "SELECT id, type, description, degree FROM Memory WHERE time=? "
        let args = [NEWLY_ADDED_TIME]
        if (category) {
            sql += " AND category=? "
            args.push(this.getCategoryIdByName(category))
        }
        sql += " LIMIT ?"
        args.push(num)

        let snapshots = []
        this.db.query(
            {
                sql: sql,
                args: args
            },
            rs => {
                while (rs.next()) {
                    snapshots.push(rs.values)
                }
            }
        )

        // query other memory
        let num_remain = num - snapshots.length
        this.db.query(
            {
                sql:
                    "SELECT id, type, description, degree FROM Memory \
                    WHERE time!=? \
                    ORDER BY remembered ASC, degree ASC, time ASC \
                    LIMIT ?",
                args: [NEWLY_ADDED_TIME, num_remain]
            },
            rs => {
                while (rs.next()) {
                    snapshots.push(rs.values)
                }
            }
        ) // query
        return snapshots
    }

    rememberUpdate(id) {
        let degree = this.getDegree(id) + 1
        if (degree < 0) degree = 0
        else if (degree > 7) degree = 7

        this.db.update({
            sql:
                "UPDATE Memory \
                 SET remembered=1, \
                 time=strftime('%s', 'now'), \
                 degree=? \
                 WHERE id=?",
            args: [degree, id]
        })
    }

    forgetUpdate(id) {
        let degree = parseInt(this.getDegree(id) / 2)
        if (degree < 0) degree = 0
        else if (degree > 7) degree = 7

        this.db.update({
            sql:
                "UPDATE Memory \
                 SET remembered=0, \
                 time=strftime('%s', 'now'), \
                 degree=? \
                 WHERE id=?",
            args: [degree, id]
        })
    }

    getCount() {
        let rs = this.db.query("SELECT count(*) FROM Memory").result
        if (rs) {
            if (rs.next()) return rs.values["count(*)"]
            else return 0
        }
    }

    getCountByCategory(ctgy) {
        let ctgyID = this.getCategoryIdByName(ctgy)
        let rs = this.db.query({ sql: "SELECT count(*) FROM Memory WHERE category=?", args: [ctgyID] }).result
        if (rs) {
            if (rs.next()) return rs.values["count(*)"]
            else return 0
        }
    }

    getNextId() {
        let lastId
        let rs = this.db.query("SELECT id FROM Memory ORDER BY id DESC LIMIT 1")
            .result
        if (rs && rs.next()) lastId = rs.values.id
        else return 0

        let count = this.getCount()

        if (count - 1 != lastId) {
            rs = this.db.query("SELECT id FROM Memory ORDER BY id ASC").result
            if (rs) {
                let ids = []
                while (rs.next()) ids.push(rs.values.id)
                if (ids[0] != 0) return 0

                let low = 1,
                    high = ids.length - 1,
                    mid
                while (low < high) {
                    mid = parseInt((low + high) / 2)
                    if (mid == ids[mid] && mid - 1 == ids[mid - 1])
                        low = mid + 1
                    else if (mid != ids[mid] && mid - 1 != ids[mid - 1])
                        high = mid - 1
                    else return mid
                } // while
                return low
            } // if rs
        } else return lastId + 1
    } // getNextId

    addMemory(type, description, categoryName) {
        let categoryId = this.getCategoryIdByName(categoryName)

        let new_id = this.getNextId()
        this.db.update({
            sql: "INSERT INTO Memory values(?, ?, ?, ?, ?, ?, ?)",
            args: [
                new_id,
                type,
                categoryId,
                description,
                NEWLY_ADDED_TIME,
                0,
                0
            ]
        })
        return new_id
    } // addMemory

    getDegree(id) {
        let rs = this.db.query({
            sql: "SELECT degree FROM Memory WHERE id=?",
            args: [id]
        }).result
        if (rs.next()) return rs.values.degree
        else return 0
    } // getDegree

    deleteById(id) {
        this.db.update({
            sql: "DELETE FROM Memory WHERE id=?",
            args: [id]
        })
    } // deleteById

    deleteCategory(ctgy) {
        let ctgyID = this.getCategoryIdByName(ctgy)
        let ord
        this.db.update({
            sql: "DELETE FROM Memory WHERE category=?",
            args: [ctgyID]
        })
        this.db.query({
            sql: "SELECT corder FROM Category WHERE name=?",
            args: [ctgy]
        }, (rs, er) => {
            if (rs && rs.next()) ord = rs.values.corder
        })
        this.db.update({
            sql: "UPDATE Category SET corder=corder-1 WHERE corder>?",
            args: [ord]
        })
        this.db.update({
            sql: "DELETE FROM Category WHERE name=?",
            args: [ctgy]
        })
    }

    renameCategory(ctgy, newName) {
        let dup = this.db.query({
            sql: "SELECT * FROM Category WHERE name=?",
            args: [newName]
        }).result

        if (dup.next()) return false

        this.db.update({
            sql: "UPDATE Category SET name=? WHERE name=?",
            args: [newName, ctgy]
        })
        return true
    }

    mergeCategory(srcCtgy, dstCtgy) {
        let srcCtgyID = this.getCategoryIdByName(srcCtgy)
        let dstCtgyID = this.getCategoryIdByName(dstCtgy)

        this.db.update({
            sql: "UPDATE Memory SET category=? WHERE category=?",
            args: [dstCtgyID, srcCtgyID]
        })

        this.deleteCategory(srcCtgy)
    }

    reorderCategory(srcCtgy, dstCtgy) {
        let sID = this.getCategoryIdByName(srcCtgy)
        let sOrd, dOrd
        this.db.query({
            sql: "SELECT corder FROM Category WHERE name=?",
            args: [srcCtgy]
        }, (rs, er) => {
            if (rs && rs.next()) sOrd = rs.values.corder
        })
        this.db.query({
            sql: "SELECT corder FROM Category WHERE name=?",
            args: [dstCtgy]
        }, (rs, er) => {
            if (rs && rs.next()) dOrd = rs.values.corder
        })
        let sql
        if (sOrd < dOrd) sql = "UPDATE Category SET corder=corder-1 WHERE corder>? AND corder<=?"
        else sql = "UPDATE Category SET corder=corder+1 WHERE corder<? AND corder>=?"
        this.db.update({
            sql: sql,
            args: [sOrd, dOrd]
        })

        this.db.update({
            sql: "UPDATE Category SET corder=? WHERE id=?",
            args: [dOrd, sID]
        })
    }

    updateContentTypeById(id, newType) {
        this.db.update({
            sql: "UPDATE Memory SET type=? WHERE id=?",
            args: [newType, id]
        })
    }

    updateDescriptionById(id, newDesc) {
        this.db.update({
            sql: "UPDATE Memory SET description=? WHERE id=?",
            args: [newDesc, id]
        })
    }

    updateCategoryById(id, newCategoryName) {
        let newCategoryId = this.getCategoryIdByName(newCategoryName)
        this.db.update({
            sql: "UPDATE Memory SET category=? WHERE id=?",
            args: [newCategoryId, id]
        })
    }
} // class

module.exports = MemoryDatabase
