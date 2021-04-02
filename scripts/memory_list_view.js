let { elegantlyFinishLoading } = require('./utilities.js');

const SCREEN_HEIGHT = $device.info.screen.height;
const SCREEN_WIDTH = $device.info.screen.width;
const SNAPSHOT_WIDTH = 80;
const SNAPSHOT_INSET = 5;
const CONTENT_HEIGHT_WIDTH_RATIO = 2 / 3;

const ContentType = {
    markdown: 0,
    image: 1,
};

class MemoryListView {
    loadNo = 0;
    nextPage = 0;
    data = [];
    estimatedRowHeight =
        SNAPSHOT_WIDTH * CONTENT_HEIGHT_WIDTH_RATIO + 2 * SNAPSHOT_INSET;

    constructor(id, callBack, layout) {
        this.id = id;
        this.callBack = callBack;

        this.pageSize = this.estimatePageSize();
        console.log('row height', this.estimatedRowHeight);
        console.log('page size is ' + this.pageSize);

        this.headerId = 'header_of_' + this.id;
        this.footerId = 'footer_of_' + this.id;
        this.footerTextId = 'text_of_' + this.footerId;

        this.toRender = {
            type: 'list',
            props: {
                id: this.id,
                style: 2,
                autoRowHeight: true,
                estimatedRowHeight: this.estimatedRowHeight,
                separatorInset: $insets(
                    0,
                    SNAPSHOT_WIDTH + SNAPSHOT_INSET * 3,
                    0,
                    SNAPSHOT_INSET * 3
                ),
                data: this.data,
                menu: this.makeMenu(),
                header: this.makeHeader(),
                footer: this.makeFooter(),
                template: this.makeTemplate(),
                actions: this.makeActions(),
            }, // props
            events: {
                ready: () => {
                    this.categorySwitched();
                },
                pulled: () => {
                    this.refreshMemoryList();
                },
                didReachBottom: (sender) => {
                    this.bottomReached(sender);
                }, // didReachBottom
            }, // events
            layout: layout,
        }; // toRender
    } // constructor

    makeMenu() {
        return {
            //title: "Context Menu",
            items: [
                {
                    title: '编辑',
                    symbol: 'pencil.and.ellipsis.rectangle',
                    inline: true,
                    items: [
                        {
                            title: '更改描述',
                            symbol: 'pencil.and.ellipsis.rectangle',
                            handler: (sender, indexPath) => {
                                this.changeDescription(sender, indexPath);
                            },
                        },
                        {
                            title: '更改类别',
                            symbol: 'tag',
                            handler: (sender, indexPath) => {
                                this.changeCategory(sender, indexPath);
                            }, // handler
                        },
                        {
                            title: '更改内容',
                            symbol: 'photo.on.rectangle',
                            handler: (sender, indexPath) => {
                                this.changeContent(sender, indexPath);
                            }, // handler
                        },
                    ],
                },
                {
                    title: '查看',
                    symbol: 'magnifyingglass',
                    inline: true,
                    items: [
                        {
                            title: '查看问题',
                            symbol: 'q.circle',
                            handler: (_sender, indexPath) => {
                                const item = this.data[indexPath.row];
                                this.quickLook(
                                    (item.type >> 0) & 1,
                                    item.qPath
                                );
                            },
                        },
                        {
                            title: '查看答案',
                            symbol: 'a.circle',
                            handler: (_sender, indexPath) => {
                                const item = this.data[indexPath.row];
                                this.quickLook(
                                    (item.type >> 1) & 1,
                                    item.aPath
                                );
                            },
                        },
                    ],
                },
            ], // items
        }; // menu
    }

    makeHeader() {
        return {
            type: 'label',
            props: {
                id: this.headerId,
                hidden: true,
                height: 20,
                text: '加载中...',
                textColor: $color('#AAAAAA'),
                align: $align.center,
                font: $font(12),
            },
        };
    }

    makeFooter() {
        return {
            type: 'view',
            props: {
                id: this.footerId,
                height: 90,
            },
            layout: (make, view) => {
                make.center.equalTo(view.super);
            },
            views: [
                {
                    type: 'label',
                    props: {
                        id: this.footerTextId,
                        text: '没有更多了',
                        textColor: $color('#AAAAAA'),
                        align: $align.center,
                        font: $font(12),
                        hidden: true,
                    },
                    layout: (make, view) => {
                        make.centerX.equalTo(view.super);
                        make.top.equalTo(view.super);
                        make.height.equalTo(20);
                    },
                },
            ],
        };
    }

    makeActions() {
        return [
            {
                title: '删除',
                color: $color('red'),
                handler: (sender, indexPath) => {
                    $ui.menu({
                        items: ['确认删除'],
                        handler: () => {
                            let deleted = this.data.splice(indexPath.row, 1)[0];
                            let id = deleted.id;
                            sender.delete(indexPath);
                            this.callBack.deleteById(id);
                        },
                    }); // $ui.menu
                }, // handler
            },
        ];
    }

    makeTemplate() {
        return {
            props: { bgcolor: $color('secondarySurface') },
            views: [
                {
                    type: 'label',
                    props: {
                        id: 'memory_desc',
                        font: $font('bold', 18),
                    },
                    layout: (make, view) => {
                        make.leading
                            .equalTo(view.super)
                            .offset(SNAPSHOT_WIDTH + 2 * SNAPSHOT_INSET + 5);
                        make.top.equalTo(view.super).offset(3 + SNAPSHOT_INSET);
                    },
                },
                {
                    type: 'view',
                    props: {
                        id: 'degree_indicator',
                        circular: true,
                    },
                    layout: (make, view) => {
                        make.size.equalTo($size(10, 10));
                        make.leading.equalTo(view.prev);
                        make.bottom
                            .equalTo(view.super)
                            .offset(-SNAPSHOT_INSET - 8);
                    },
                },
                {
                    type: 'label',
                    props: {
                        id: 'time_info',
                        font: $font(14),
                        textColor: $color('secondaryText'),
                    },
                    layout: (make, view) => {
                        make.leading.equalTo(view.prev.trailing).offset(4);
                        make.centerY.equalTo(view.prev);
                    },
                },
                {
                    type: 'label',
                    props: {
                        id: 'category_text',
                        cornerRadius: 3,
                        font: $font(11),
                        textColor: $color('secondaryText'),
                    },
                    layout: (make, view) => {
                        make.leading.equalTo(view.prev.trailing).offset(15);
                        make.centerY.equalTo(view.prev);
                    },
                },
                {
                    type: 'blur',
                    props: {
                        id: 'category_bg',
                        style: $blurStyle.ultraThinMaterial,
                        cornerRadius: 3,
                    },
                    layout: (make, view) => {
                        make.center.equalTo(view.prev);
                        make.width.equalTo(view.prev).offset(10);
                        make.height.equalTo(view.prev).offset(4);
                    },
                    events: {
                        ready: (sender) => {
                            sender.moveToBack();
                        },
                    },
                },
                {
                    type: 'image',
                    props: {
                        id: 'snapshot',
                        cornerRadius: 5,
                        borderWidth: 1,
                        borderColor: $color('lightGray', 'darkGray'),
                    },
                    layout: (make, view) => {
                        make.width.equalTo(SNAPSHOT_WIDTH);
                        make.height
                            .equalTo(view.width)
                            .multipliedBy(CONTENT_HEIGHT_WIDTH_RATIO);

                        make.top.left.bottom.inset(SNAPSHOT_INSET);
                    },
                },
            ],
        };
    }

    estimatePageSize() {
        let biggerSpan =
            SCREEN_HEIGHT > SCREEN_WIDTH ? SCREEN_HEIGHT : SCREEN_WIDTH;
        return parseInt(biggerSpan / this.estimatedRowHeight) + 1;
    }

    // callBacks
    bottomReached(sender) {
        sender.endFetchingMore();

        let newData = this.getNextPageData();
        if (newData.length) {
            this.data = this.data.concat(newData);
            this.updateListData();
        } else {
            $(this.footerTextId).hidden = false;
        }
    }

    async changeDescription(_sender, indexPath) {
        // item is not an object in this.data
        const item = this.data[indexPath.row];
        const desc = await this.callBack.inputDescription(item.desc);
        if (desc) {
            this.callBack.changeDescriptionById(item.id, desc);

            item.desc = desc;
            this.updateListData();
        }
    }

    async changeCategory(sender, indexPath) {
        // item is not an object in this.data
        const item = this.data[indexPath.row];

        const oldCtgy = item.category;
        const allCtgy = this.callBack.getAllCategories();
        const index = allCtgy.indexOf(oldCtgy);
        allCtgy.unshift(allCtgy.splice(index, 1)[0]);
        allCtgy.push('新增类别');

        let selectedIndex = 0;
        const selected = await $picker.data({
            props: { items: [allCtgy] },
            events: {
                changed: (sender) => {
                    selectedIndex = sender.selectedRows[0];
                },
            },
        });

        // category (==0) not changed or undefined
        if (!selected || !selectedIndex) return;

        // update database
        let targetCtgy;
        if (selectedIndex == allCtgy.length - 1) {
            // add new category
            targetCtgy = await this.callBack.inputCategory();
            if (!targetCtgy) return;

            if (!this.callBack.addCategory(targetCtgy)) {
                $ui.warning('添加新类别失败，可能与已有类别名重复');
                return;
            } else {
                this.callBack.changeCategoryById(item.id, targetCtgy);
                this.callBack.reloadCategory();
            }
        } else {
            targetCtgy = allCtgy[selectedIndex];
            // change to target category
            this.callBack.changeCategoryById(item.id, targetCtgy);
        }

        // update list data
        const currCtgy = this.callBack.getCurrentCategory();
        if (currCtgy) {
            sender.delete(indexPath);
            this.data.splice(indexPath.row, 1);
        } else {
            item.category = targetCtgy;
            this.updateListData();
        }
        $ui.success('修改成功');
    }

    changeContent(sender, indexPath) {
        // item is not an object in this.data
        const item = this.data[indexPath.row];

        // schedule loading indicator
        this.loadNo++;
        this.callBack.disableInteraction();
        let loadingStartTime = null;
        const scheduledLoadingIndicator = setTimeout(() => {
            this.callBack.showLoadingIndicator(() => {
                // called when loading canceled
                this.loadNo++;
                this.callBack.enableInteraction();
            });
            loadingStartTime = Date.now();
        }, 500);

        const currNo = this.loadNo;

        this.callBack
            .changeContentById(
                item.id,
                // called when files successfully loaded, return value determine whether continue or not
                () => {
                    if (currNo != this.loadNo) {
                        // be canceled while loading files
                        return true;
                    } else {
                        return false;
                    }
                },
                // called both after successful/unsuccessful file loading
                // to hide loading indicator and enable interaction
                () => {
                    elegantlyFinishLoading(
                        scheduledLoadingIndicator,
                        loadingStartTime,
                        500,
                        this.callBack.enableInteraction,
                        this.callBack.hideLoadingIndicator
                    );
                }
            )
            .then(
                (newMemInfo) => {
                    if (!newMemInfo) return;

                    const oldCtgy = this.callBack.getCurrentCategory();

                    if (item.category !== newMemInfo.category && oldCtgy) {
                        // category changed, delete from list
                        this.callBack.reloadCategory();

                        sender.delete(indexPath);
                        this.data.splice(indexPath.row, 1);
                    } else {
                        // modify data
                        Object.assign(item, newMemInfo);
                        item.snapshotLoaded = false;

                        this.updateListData();
                    }
                },
                (err) => {
                    if (currNo !== this.loadNo) return;

                    console.error('Failed to load memory resources.');
                    console.error(err);
                    $ui.error('修改失败，请检查网络');
                }
            ); // Promise.then
    } // changeContent

    getIndexPathsForVisibleRows() {
        return $(this.id)
            .ocValue()
            .$indexPathsForVisibleRows()
            .jsValue()
            .map((v) => v.row);
    }

    isSnapshotValidAfterLoaded(idBeforeLoad, row) {
        const item = this.data[row];
        if (!item) return false;

        const { id: idAfterLoad, snapshotLoaded } = item;
        if (idAfterLoad === idBeforeLoad && !snapshotLoaded) {
            return true;
        } else {
            return false;
        }
    }

    loadSnapshotSuccessfully(mListOc, row, path) {
        // set data in runtime
        const snapshotOc = mListOc
            .$data()
            .$objectAtIndex(row)
            .$valueForKey('snapshot');
        snapshotOc.$removeObjectForKey('symbol');
        snapshotOc.$setValue_forKey(path, 'src');
        snapshotOc.$setValue_forKey($contentMode.scaleToFill, 'contentMode');

        const visibleRows = this.getIndexPathsForVisibleRows();
        if (visibleRows.findIndex((v) => v === row) > -1) {
            // reload only currently visible
            const snapshotView = $(this.id).cell($indexPath(0, row)).views[0]
                .views[5];
            snapshotView.src = path;
            snapshotView.contentMode = $contentMode.scaleToFill;
        }

        // set data in JSBox
        const item = this.data[row];
        item.snapshotLoaded = true;
    }

    loadSnapshotFailed(mListOc, row) {
        // set data in runtime
        const snapshotOc = mListOc
            .$data()
            .$objectAtIndex(row)
            .$valueForKey('snapshot');
        snapshotOc.$removeObjectForKey('src');
        snapshotOc.$setValue_forKey('exclamationmark.icloud', 'symbol');
        snapshotOc.$setValue_forKey($contentMode.center, 'contentMode');

        const visibleRows = this.getIndexPathsForVisibleRows();
        if (visibleRows.findIndex((v) => v === row) > -1) {
            // reload only currently visible
            const snapshotView = $(this.id).cell($indexPath(0, row)).views[0]
                .views[5];
            snapshotView.symbol = 'exclamationmark.icloud';
            snapshotView.contentMode = $contentMode.center;
        }

        // set data in JSBox
        const item = this.data[row];
        item.snapshotLoaded = false;
    }

    makeData() {
        const showCategory = this.callBack.getCurrentCategory() ? false : true;
        return this.data.map((mem) => {
            const { snapshotLoaded } = mem;
            const snapshot = snapshotLoaded
                ? {
                      src: mem.sPath,
                      contentMode: $contentMode.scaleToFill,
                  }
                : {
                      symbol: 'icloud',
                      contentMode: $contentMode.center,
                  };

            return {
                snapshot,
                memory_desc: {
                    text: mem.desc,
                    textColor: mem.remembered
                        ? $color('primaryText')
                        : $color('red'),
                },
                degree_indicator: {
                    bgcolor: MemoryListView.DEGREE_COLORS[mem.degree],
                },
                time_info: {
                    text: mem.timeInfo,
                },
                category_bg: {
                    hidden: showCategory ? false : true,
                },
                category_text: {
                    text: mem.category,
                    hidden: showCategory ? false : true,
                },
            };
        });
    }

    updateListData() {
        // update list data
        $(this.id).data = this.makeData();
        // async snapshot loading
        const mListOc = $(this.id).ocValue();
        for (let row = 0; row < this.data.length; row++) {
            const { id: idBeforeLoad, snapshotLoaded, sPath: path } = this.data[
                row
            ];

            if (snapshotLoaded) {
                continue;
            }

            this.callBack
                .loadResource(path)
                .finally(() => {
                    if (!this.isSnapshotValidAfterLoaded(idBeforeLoad, row)) {
                        return Promise.reject({ snapshotInvalid: true });
                    }
                })
                .then(
                    (_data) => {
                        this.loadSnapshotSuccessfully(mListOc, row, path);
                    },
                    (err) => {
                        if (err.snapshotInvalid) return;

                        // only handle error from
                        console.error('Load snapshot failed.');
                        console.error(err);

                        this.loadSnapshotFailed(mListOc, row);
                    }
                );
        }
    }

    categorySwitched() {
        $(this.footerTextId).hidden = true;

        this.nextPage = 0;
        this.data = this.getNextPageData();
        this.updateListData();
    }

    categoryRenamed(oldName, newName) {
        const currCtgy = this.callBack.getCurrentCategory();
        if (!currCtgy) {
            for (const item of this.data) {
                if (item.category === oldName) {
                    item.category = newName;
                }
            }
            this.updateListData();
        } else if (currCtgy === oldName) {
            for (const item of this.data) {
                item.category = newName;
            }
        }
    }

    // methods
    getNextPageData() {
        const mems = this.callBack.getMemoryByPage(
            this.nextPage,
            this.pageSize,
            this.callBack.getCurrentCategory()
        );
        if (mems.length) {
            this.nextPage++;
        }

        return mems.map((mem) => {
            mem.snapshotLoaded = false;
            return mem;
        });
    } // loadNextPage

    quickLook(contentType, path) {
        this.callBack.disableInteraction();
        // schedule loading indicator
        let loadingStartTime = null;
        const scheduledLoadingIndicator = setTimeout(() => {
            this.callBack.showLoadingIndicator(() => {
                // do after cancellation of loading
                this.loadNo++;
                // immediately enable interaction
                this.callBack.enableInteraction();
            });
            loadingStartTime = Date.now();
        }, 500);

        const currNo = ++this.loadNo;
        this.callBack
            .loadResource(path)
            .finally(() => {
                // determine whether loading cancellation happens
                if (currNo != this.loadNo) {
                    return Promise.reject({ quickLookCanceled: true });
                } else {
                    this.callBack.enableInteraction();
                }
            })
            .then(
                (data) => {
                    elegantlyFinishLoading(
                        scheduledLoadingIndicator,
                        loadingStartTime,
                        500,
                        () => {
                            if (contentType == ContentType.image) {
                                $quicklook.open({
                                    url:
                                        'file://' +
                                        $file
                                            .absolutePath(path)
                                            .replace(' ', '%20'), // no space char
                                });
                            } else if (contentType == ContentType.markdown) {
                                let md = data.string;
                                let html = $text.markdownToHtml(md);
                                $quicklook.open({ html: html });
                            } else
                                console.error(
                                    'Error: unsupported content type.'
                                );
                        },
                        this.callBack.hideLoadingIndicator
                    );
                },
                (err) => {
                    if (err.quickLookCanceled) return;

                    console.error(
                        `Failed to preview content of path "${path}".`
                    );
                    console.error(err);

                    elegantlyFinishLoading(
                        scheduledLoadingIndicator,
                        loadingStartTime,
                        500,
                        () => {
                            $ui.error('查看失败，请检查网络');
                        },
                        this.callBack.hideLoadingIndicator
                    );
                }
            );
    } // quicklook

    refreshMemoryList() {
        $(this.footerTextId).hidden = true;

        $(this.id).beginRefreshing();
        $(this.headerId).hidden = false;
        this.nextPage = 0;
        this.data = this.getNextPageData();
        this.updateListData();
        $delay(0.5, () => {
            $(this.id).endRefreshing();
            $(this.headerId).hidden = true;
        });
    }
} // class

MemoryListView.DEGREE_COLORS = [
    $color('#ff0000'),
    $color('#ff0077'),
    $color('#ff00ff'),
    $color('#7700ff'),
    $color('#0000ff'),
    $color('#00ccff'),
    $color('#00ffff'),
    $color('#00ff00'),
];

module.exports = MemoryListView;
