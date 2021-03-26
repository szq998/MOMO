const DB_PATH = './assets/memory.db'; //"shared://test.db"
const MEMORY_RESOURCE_PATH = './assets/memory';

let { elegantlyFinishLoading, getTimeInfo } = require('./scripts/utilities.js');

$app.theme = 'auto';

const MemoryDatabase = require('./scripts/memory_database.js');
const MemoryModel = require('./scripts/memory_model.js');
const MemoryView = require('./scripts/memory_view.js');
const MainView = require('./scripts/main_view.js');
const MemorySettingView = require('./scripts/memory_setting_view.js');

loadMemoryDB()
    .catch((err) => {
        console.error(err);
        $app.close();
    })
    .then(main);

function main(memoryDB) {
    $app.listen({
        // 在应用退出之前调用
        exit: function () {
            if (memoryDB) memoryDB.close();
            console.log('memoryDB closed');
        },
    });

    const mmCallBack = {
        finish: () => {
            $ui.pop();
            $ui.success('完成');
            mainView.refreshMemoryList();
        },
    };
    const memoryModel = new MemoryModel(memoryDB, mmCallBack);

    const mvCallBack = {
        remember: getRememberOrForgetCallback(memoryModel, 'r'),
        forget: getRememberOrForgetCallback(memoryModel, 'f'),
        skip: getRememberOrForgetCallback(memoryModel, 's'),
        getContent: () => {
            const currId = memoryModel.getCurrentId();
            const currType = memoryModel.getCurrentType();

            if (typeof currId == 'undefined') {
                return Promise.resolve(undefined);
            } else {
                return getContent(currId, currType).then((content) => {
                    content.type = currType;
                    return content;
                });
            }
        },
        ready: () => {
            $ui.title = memoryModel.getCurrentDescription();
            // let currId = memoryModel.getCurrentId();
            // let currType = memoryModel.getCurrentType();

            // let content = getContent(currId, currType);

            // content.type = currType;
            // return content;
        },
    };
    const memoryView = new MemoryView('memory_view', mvCallBack);

    const mavCallBack = {
        loadResource: loadResource,
        startMemory: () => {
            startMemory(memoryDB, memoryModel, memoryView, mainView);
        },
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
        changeContentById: (id, isCancelled, loadingFinishHandler) => {
            const mem = memoryDB.getMemoryById(id);
            return getContent(id, mem.type)
                .finally(loadingFinishHandler)
                .then(({ question, answer }) => {
                    if (isCancelled()) {
                        return;
                    }

                    return new Promise((resolve) => {
                        const oldContent = {
                            type: mem.type,
                            desc: mem.description,
                            question: question,
                            answer: answer,
                            category: mem.category,
                        };

                        memorySettingView
                            .editMemory(id, oldContent)
                            .then(() => {
                                let newMem = memoryDB.getMemoryById(id);
                                let { qPath, aPath, sPath } = getContentPath(
                                    id,
                                    newMem.type
                                );
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
                const { qPath, aPath, sPath } = getContentPath(m.id, m.type);

                // let daysAgo = m.time == 0 ? undefined : getDaysAgo(m.time);
                // let timeInfo = '';
                // if (m.time == 0) timeInfo += '新添加';
                // else if (daysAgo == 0) timeInfo += '今天';
                // else if (daysAgo == 1) timeInfo += '昨天';
                // else timeInfo += daysAgo + '天前';
                // timeInfo += m.time && !m.remembered ? ' 忘记' : '';

                const timeInfo = getTimeInfo(m.time)

                const memInfo = {
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
                    timeInfo: timeInfo,
                };
            });
        },
    };
    const mainView = new MainView('main_view', mavCallBack);

    const msvCallBack = {
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
    const memorySettingView = new MemorySettingView(
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
}

function loadResource(path) {
    return new Promise((resolve, reject) => {
        if ($file.exists(path)) {
            resolve($file.read(path));
            // setTimeout(() => {
            //     if (Math.random() < 0.8) resolve($file.read(path));
            //     else reject('123');
            //     // console.log("loaded")
            // }, Math.random() * 2000);
        } else {
            const iCloudMetaPath = getICloudMetaPath(path);
            if (!$file.exists(iCloudMetaPath)) {
                reject(new Error(`File at path "${path}" not found.`));
            }
            $file.download(iCloudMetaPath).then(resolve).catch(reject);
        }
    });
}

function loadMemoryDB() {
    return new Promise((resolve, reject) => {
        let memoryDB;
        if ($file.exists(DB_PATH)) {
            // a db exists locally
            memoryDB = new MemoryDatabase(DB_PATH);
            resolve(memoryDB);
        } else {
            // no db exists locally
            const iCloudMetaPath = getICloudMetaPath(DB_PATH);
            if (!$file.exists(iCloudMetaPath)) {
                // also no db exists in the iCloud, then create one
                // create db
                memoryDB = MemoryDatabase.createMemoryDatabase(DB_PATH);
                // mkdir for memory resource
                $file.mkdir(MEMORY_RESOURCE_PATH);
                $ui.alert('首次运行，已创建数据库');
                resolve(memoryDB);
            } else {
                // a db exists remotely in the iCloud, then try loading it
                let indicatorStartTime = null;
                // schedule a indicator if loading lasts more then 500ms
                const delayedLoadingIndicator = setTimeout(() => {
                    // show loading indicator
                    $ui.render({
                        props: { bgcolor: $color('#F2F1F6', 'primarySurface') },
                        views: [
                            {
                                type: 'spinner',
                                props: { loading: true },
                                layout: $layout.center,
                            },
                        ],
                    });
                    indicatorStartTime = Date.now();
                }, 500);
                // try to download
                $file
                    .download(iCloudMetaPath)
                    .then((_) => {
                        // ensure indicator lasts more than 500ms, if it is shown
                        elegantlyFinishLoading(
                            delayedLoadingIndicator,
                            indicatorStartTime,
                            500,
                            () => {
                                memoryDB = new MemoryDatabase(DB_PATH);
                                resolve(memoryDB);
                            }
                        );
                    })
                    .catch((err) => {
                        console.error(
                            'Failed to download database file from iCloud. Check your network connection.'
                        );
                        reject(err);
                    });
            }
        }
    });
}

function getICloudMetaPath(path) {
    return path.replace(/(\/|^)([^\/]+)$/, (_, cap0, name) => {
        return cap0 + '.' + name + '.icloud';
    });
}

// function getDaysAgo(lts0) {
//     let ts0 = new Date(new Date(lts0 * 1000).toLocaleDateString()).getTime();
//     let ts1 = new Date(new Date().toLocaleDateString()).getTime();
//     return parseInt((ts1 - ts0) / (1000 * 24 * 60 * 60));
// }

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
    const { qPath, aPath, sPath } = getContentPath(id, type);

    return Promise.all([
        loadResource(qPath),
        loadResource(aPath),
        loadResource(sPath),
    ]).then(([qData, aData, _sData]) => {
        return {
            question: (type >> 0) & 1 ? $image(qPath) : qData.string,
            answer: (type >> 1) & 1 ? $image(aPath) : aData.string,
            snapshot: $image(sPath),
        };
    });
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

function getRememberOrForgetCallback(memoryModel, action) {
    return () => {
        if (action === 'r') memoryModel.remember();
        else if (action === 'f') memoryModel.forget();
        else if (action === 's') memoryModel.skip();

        let currDesc = memoryModel.getCurrentDescription();
        if (currDesc) {
            $ui.title = currDesc;
        }
    };
}

function startMemory(memoryDB, memoryModel, memoryView, mainView) {
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
