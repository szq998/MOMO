const DB_PATH = './assets/memory.db'; //"shared://test.db"
const MEMORY_RESOURCE_PATH = './assets/memory';

$app.theme = 'auto';
$app.listen({
    // 在应用退出之前调用
    exit: function () {
        if (memoryDB) memoryDB.close();
        console.log('memoryDB closed');
    },
});

let MemoryDatabase = require('./scripts/memory_database.js');
let MemoryModel = require('./scripts/memory_model.js');
let MemoryView = require('./scripts/memory_view.js');
let MainView = require('./scripts/main_view.js');
let MemorySettingView = require('./scripts/memory_setting_view.js');

let memoryDB;
if (!$file.exists(DB_PATH)) {
    // TODO: async file
    memoryDB = MemoryDatabase.createMemoryDatabase(DB_PATH);
    $file.mkdir(MEMORY_RESOURCE_PATH);
    $ui.alert('首次运行，已创建数据库');
} else memoryDB = new MemoryDatabase(DB_PATH);

let mmCallBack = {
    finish: () => {
        $ui.pop();
        $ui.success('完成');
        mainView.refreshMemoryList();
    },
};
let memoryModel = new MemoryModel(memoryDB, mmCallBack);

let mvCallBack = {
    remember: getRememberOrForgetCallback(memoryModel, 'r'),
    forget: getRememberOrForgetCallback(memoryModel, 'f'),
    ready: () => {
        $ui.title = memoryModel.getCurrentDescription();
        let currId = memoryModel.getCurrentId();
        let currType = memoryModel.getCurrentType();
        let content = getContent(currId, currType);

        content.type = currType;
        return content;
    },
};
let memoryView = new MemoryView('memory_view', mvCallBack);

let mavCallBack = {
    startMemory: startMemory,
    addMemory: () => {
        return memorySettingView.addMemory();
    },
    getAllCategories: () => {
        return memoryDB.getAllCategories();
    },
    getCountByCategory: (ctgy) => {
        return memoryDB.getCountByCategory(ctgy);
    },
    addCategory: (text) => {
        if (text == '全部') return false;
        else return memoryDB.addCategory(text);
    },
    reorderCategory: (srcCtgy, dstCtgy) => {
        memoryDB.reorderCategory(srcCtgy, dstCtgy);
    },
    deleteCategory: (ctgy) => {
        memoryDB.deleteCategory(ctgy);
    },
    renameCategory: (ctgy, newName) => {
        return memoryDB.renameCategory(ctgy, newName);
    },
    mergeCategory: (srcCtgy, dstCtgy) => {
        memoryDB.mergeCategory(srcCtgy, dstCtgy);
    },
    deleteById: (id) => {
        memoryDB.deleteById(id);
        // delete resource
        let cDir = getContentDir(id);
        $file.delete(cDir);
    },
    changeDescriptionById: (id, newDesc) => {
        memoryDB.updateDescriptionById(id, newDesc);
    },
    changeCategoryById: (id, newCtgy) => {
        memoryDB.updateCategoryById(id, newCtgy);
    },
    changeContentById: (id) => {
        let mem = memoryDB.getMemoryById(id);
        let { question, answer } = getContent(id, mem.type);
        let oldContent = {
            type: mem.type,
            desc: mem.description,
            question: question,
            answer: answer,
            category: mem.category,
        };

        return new Promise((resolve) => {
            memorySettingView.editMemory(id, oldContent).then(() => {
                let newMem = memoryDB.getMemoryById(id);
                let { qPath, aPath, sPath } = getContentPath(id, newMem.type);
                let newInfo = {
                    type: newMem.type,
                    desc: newMem.description,
                    qPath: qPath,
                    aPath: aPath,
                    sPath: sPath,
                    category: newMem.category,
                };
                resolve(newInfo);
            });
        });
    },
    getMemoryByPage: (pageNo, pageSize, category) => {
        let memory = [];
        if (pageNo == 0)
            memory = memory.concat(memoryDB.getNewlyAddedMemory(category));
        memory = memory.concat(
            memoryDB.getMemory(pageNo, pageSize, category, false)
        );

        return memory.map((m) => {
            let { qPath, aPath, sPath } = getContentPath(m.id, m.type);
            let lastDay = m.time == 0 ? undefined : getDaysAgo(m.time);

            let detail = '';
            if (m.time == 0) detail += '新添加';
            else if (lastDay == 0) detail += '今天';
            else if (lastDay == 1) detail += '昨天';
            else detail += lastDay + '天前';
            detail += m.time && !m.remembered ? ' 忘记' : '';

            let memInfo = {
                type: m.type,
                desc: m.description,
                category: m.category,
                qPath: qPath,
                aPath: aPath,
                sPath: sPath,
            };
            return {
                id: m.id,
                memInfo: memInfo,
                degree: m.degree,
                detailedInfo: detail,
            };
        });
    },
};
let mainView = new MainView('main_view', mavCallBack);

let msvCallBack = {
    inputCategory: MainView.inputCategory,
    addCategory: (text) => {
        if (text == '全部') return false;
        else return memoryDB.addCategory(text);
    },
    getAllCategories: () => {
        return memoryDB.getAllCategories(false);
    },
    add: (mem) => {
        let newId = memoryDB.addMemory(mem.type, mem.desc, mem.category);
        saveContent(newId, mem);
    },
    modify: (id, mem) => {
        memoryDB.updateDescriptionById(id, mem.desc);
        memoryDB.updateTypeById(id, mem.type);
        memoryDB.updateCategoryById(id, mem.category);

        saveContent(id, mem);
    },
};
let memorySettingView = new MemorySettingView(
    'memory_setting_view',
    msvCallBack
);

$ui.render({
    props: {
        title: '默默记点啥',
        bgcolor: $color('#F2F1F6', 'primarySurface'),
        titleView: memorySettingView.getNavBarView(),
    },
    views: [mainView.toRender, memorySettingView.toRender],
});


function getDaysAgo(lts0) {
    let ts0 = new Date(new Date(lts0 * 1000).toLocaleDateString()).getTime();
    let ts1 = new Date(new Date().toLocaleDateString()).getTime();
    return parseInt((ts1 - ts0) / (1000 * 24 * 60 * 60));
}

function getContentDir(id) {
    return MEMORY_RESOURCE_PATH + '/' + id;
}

function getContentPath(id, type) {
    let cDir = getContentDir(id);
    return {
        qPath: cDir + '/q.' + ((type >> 0) & 1 ? 'jpg' : 'md'),
        aPath: cDir + '/a.' + ((type >> 1) & 1 ? 'jpg' : 'md'),
        sPath: cDir + '/s.png',
    };
}

function getContent(id, type) {
    let { qPath, aPath, sPath } = getContentPath(id, type);
    return {
        question: (type >> 0) & 1 ? $image(qPath) : $file.read(qPath).string, // TODO: async file
        answer: (type >> 1) & 1 ? $image(aPath) : $file.read(aPath).string, // TODO: async file
        snapshot: $image(sPath), // TODO: async file
    };
}

function saveContent(id, content) {
    let cDir = getContentDir(id);
    $file.mkdir(cDir);
    let { question, answer, snapshot, type } = content;
    let { sPath, qPath, aPath } = getContentPath(id, type);
    $file.write({
        data: snapshot.png,
        path: sPath,
    });
    $file.write({
        data: (type >> 0) & 1 ? question.jpg(1) : $data({ string: question }),
        path: qPath,
    });
    $file.write({
        data: (type >> 1) & 1 ? answer.jpg(1) : $data({ string: answer }),
        path: aPath,
    });
}

function getRememberOrForgetCallback(memoryModel, rOrF) {
    return () => {
        if (rOrF == 'r') memoryModel.remember();
        else if (rOrF == 'f') memoryModel.forget();

        let currDesc = memoryModel.getCurrentDescription();
        $ui.title = currDesc ? currDesc : $ui.title;

        let currId = memoryModel.getCurrentId();
        let currType = memoryModel.getCurrentType();
        if (typeof currId == 'undefined') return undefined;
        else {
            let content = getContent(currId, currType);
            content.type = currType;
            return content;
        }
    };
}

function startMemory() {
    if (memoryDB.getCount() > 0) {
        // cache out
        let lastNum =
            $cache.get('using') && $cache.get('using').lastNum
                ? $cache.get('using').lastNum
                : null;
        $input.text({
            type: $kbType.number,
            text: lastNum,
            placeholder: '输入需要记忆的问题数量',
            handler: function (text) {
                let num = parseInt(text);
                if (num && num > 0) {
                    // cache in
                    $cache.set('using', { lastNum: num });
                    // start model
                    let mSnapshots = memoryDB.getMostForgettableMemorySnapshots(
                        num,
                        mainView.getCurrentCategory()
                    );
                    memoryModel.start(mSnapshots);
                    // start view
                    if (mSnapshots.length > 0)
                        $ui.push({
                            props: { title: '' },
                            views: [memoryView.toRender],
                            events: {
                                disappeared: () => {
                                    mainView.refreshMemoryList();
                                },
                            },
                        });
                    // $ui.push
                    else $ui.warning('找不到记录');
                } // if
                else $ui.warning('输入错误');
            }, // handler
        }); // $input.text
    } else $ui.warning('找不到记录，请添加');
} // start memory
