const NEWLY_ADDED_TIME = 0

class MemoryDatabase {
    constructor(dbPath) {
        this.db = $sqlite.open(dbPath)
    }

    static createMemoryDatabase(dbPath) {
        let db = $sqlite.open(dbPath)
        db.update(
            "CREATE TABLE Memory( \
            id integer primary key,\
            type integer,\
            description text,\
            lastTime integer,\
            isRememberedLastTime integer,\
            memoryDegree integer￼)"
        )
        db.close()

        return new MemoryDatabase(dbPath)
    }

    close() {
        this.db.close()
    }

    getNewlyAddedMemory() {
        let memory = []
        // query newly add memoryif
        this.db.query(
            {
                sql:
                    "SELECT * FROM Memory WHERE lastTime=?",
                args: [NEWLY_ADDED_TIME]
            },
            rs => {
                while (rs.next()) {
                    memory.push(rs.values)
                }
            }
        )
        return memory
    }

    getMemory(pageNo, pageSize, isNewlyAddedIncluded = false) {
        let memory = []
        let sql = isNewlyAddedIncluded
            ? {
                sql:
                    "SELECT * FROM Memory \
                       ORDER BY isRememberedLastTime ASC, memoryDegree ASC, lastTime ASC \
                       LIMIT ? OFFSET ?",
                args: [pageSize, pageNo * pageSize]
            }
            : {
                sql:
                    "SELECT * FROM Memory \
                       WHERE lastTime!=? \
                       ORDER BY isRememberedLastTime ASC, memoryDegree ASC, lastTime ASC \
                       LIMIT ? OFFSET ?",
                args: [NEWLY_ADDED_TIME, pageSize, pageNo * pageSize]
            }

        this.db.query(sql, (rs, er) => {
            while (rs.next()) {
                memory.push(rs.values)
            }
        }) // query
        return memory
    }

    getMemoryById(id) {
        let mem
        this.db.query({
            sql: "SELECT * FROM Memory WHERE id=?",
            args: [id]
        }, (rs, er) => {
            if (rs && rs.next()) mem = rs.values
        })
        return mem
    }

    getMostForgetableMemorySnapshots(num) {
        let snapshots = []
        // query newly add memoryif
        this.db.query(
            {
                sql:
                    "SELECT id, type, description, memoryDegree FROM Memory \
                    WHERE lastTime=? \
                    LIMIT ?",
                args: [NEWLY_ADDED_TIME, num]
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
                    "SELECT id, type, description, memoryDegree FROM Memory \
                    WHERE lastTime!=? \
                    ORDER BY isRememberedLastTime ASC, memoryDegree ASC, lastTime ASC \
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
                 SET isRememberedLastTime=1, \
                 lastTime=strftime('%s', 'now'), \
                 memoryDegree=? \
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
                 SET isRememberedLastTime=0, \
                 lastTime=strftime('%s', 'now'), \
                 memoryDegree=? \
                 WHERE id=?",
            args: [degree, id]
        })
    }

    getCount() {
        let rs = this.db.query("SELECT count(*) FROM Memory").result
        if (rs && rs.next()) return rs.values["count(*)"]
        else return 0
    }

    getNextId() {
        let lastId
        let rs = this.db.query(
            "SELECT id FROM Memory ORDER BY id DESC LIMIT 1"
        ).result
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

    addMemory(type, description) {
        let new_id = this.getNextId()
        this.db.update({
            sql: "INSERT INTO Memory values(?, ?, ?, ?, ?, ?)",
            args: [new_id, type, description, NEWLY_ADDED_TIME, 0, 0]
        })
        return new_id
    } // addMemory

    getDegree(id) {
        let rs = this.db.query({
            sql: "SELECT memoryDegree FROM Memory WHERE id=?",
            args: [id]
        }).result
        if (rs.next()) return rs.values.memoryDegree
        else return 0
    } // getDegree

    deleteById(id) {
        this.db.update({
            sql: "DELETE FROM Memory WHERE id=?",
            args: [id]
        })
    } // deleteById

    updateDescriptionById(id, newDesc) {
        this.db.update({
            sql: "UPDATE Memory SET description=? WHERE id=?",
            args: [newDesc, id]
        })
    }

} // class

module.exports = MemoryDatabase
