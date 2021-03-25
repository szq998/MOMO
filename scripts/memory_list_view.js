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
    constructor(id, callBack, layout) {
        this.id = id;
        this.callBack = callBack;
        this.nextPage = 0;
        this.data = [];

        this.estimatedRowHeight =
            SNAPSHOT_WIDTH * CONTENT_HEIGHT_WIDTH_RATIO + 2 * SNAPSHOT_INSET;
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
                data: this.data,
                menu: this.makeMenu(),
                header: this.makeHeader(),
                footer: this.makeFooter(),
                template: this.makeTemplate(),
                actions: this.makeActions(),
            }, // props
            events: {
                ready: (sender) => {
                    this.categorySwitched();
                },
                pulled: (sender) => {
                    this.refreshMemoryList();
                },
                didReachBottom: (sender) => {
                    this.bottomReached(sender);
                }, // didReachBottom
                didSelect: (sender, indexPath, data) => {
                    // TODO: change quicklook functionality to select memory
                    this.quickLook(
                        (data.memInfo.type >> 0) & 1,
                        data.memInfo.qPath
                    );
                }, // didSelected
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
                            handler: (sender, indexPath, data) => {
                                this.changeDescription(sender, indexPath, data);
                            },
                        },
                        {
                            title: '更改类别',
                            symbol: 'tag',
                            handler: (sender, indexPath, data) => {
                                this.changeCategory(sender, indexPath, data);
                            }, // handler
                        },
                        {
                            title: '更改内容',
                            symbol: 'photo.on.rectangle',
                            handler: (sender, indexPath, data) => {
                                this.changeContent(sender, indexPath, data);
                            }, // handler
                        },
                    ],
                },
                {
                    title: '查看答案',
                    symbol: 'lock.open',
                    destructive: true,
                    handler: (sender, indexPath, data) => {
                        this.quickLook(
                            (data.memInfo.type >> 1) & 1,
                            data.memInfo.aPath
                        );
                    },
                },
            ], // items
        }; // menu
    }

    makeHeader() {
        return {
            type: 'label',
            props: {
                id: this.headerId,
                height: 20,
                text: '所有记录',
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
                        text: '加载中...',
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
                        handler: (title, idx) => {
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
                {
                    type: 'label',
                    props: {
                        id: 'memory_desc',
                        font: $font('bold', 18),

                        textColor: $color('primaryText'),
                    },
                    layout: (make, view) => {
                        make.leading.equalTo(view.prev.trailing).offset(8);
                        make.top.equalTo(view.prev).offset(3);
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
                        make.bottom.equalTo(view.prev.prev).offset(-10);
                    },
                },
                {
                    type: 'label',
                    props: {
                        id: 'detailed_info',
                        font: $font(14),
                        // textColor: $color("darkGray")
                        textColor: $color('secondaryText'),
                    },
                    layout: (make, view) => {
                        make.leading.equalTo(view.prev.trailing).offset(4);
                        make.centerY.equalTo(view.prev);
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
        $(this.footerTextId).hidden = false;
        let newData = this.getNextPageData();
        if (newData.length) {
            this.data = this.data.concat(newData);
            this.updateListData();
            $delay(0.5, () => {
                $(this.footerTextId).hidden = true;
                sender.endFetchingMore();
            });
        } else {
            $ui.toast('已全部加载');
            $(this.footerTextId).hidden = true;
            sender.endFetchingMore();
        }
    }

    async changeDescription(sender, indexPath, data) {
        let desc = await this.callBack.inputDescription(data.memInfo.desc);
        if (desc) {
            let newData = data;
            newData.memInfo.desc = desc;
            newData.memory_desc.text = desc;
            this.data[indexPath.row] = newData;
            this.callBack.changeDescriptionById(data.id, desc);

            sender.delete(indexPath);
            sender.insert({
                indexPath: indexPath,
                value: newData,
            });
        }
    }

    async changeCategory(sender, indexPath, data) {
        let oldCtgy = data.memInfo.category;
        let allCtgy = this.callBack.getAllCategories();
        let index = allCtgy.indexOf(oldCtgy);
        allCtgy.unshift(allCtgy.splice(index, 1)[0]);
        allCtgy.push('新增类别');

        let selectedIndex = 0;
        await $picker.data({
            props: { items: [allCtgy] },
            events: {
                changed: (sender) => {
                    selectedIndex = sender.selectedRows[0];
                },
            },
        });

        // category (==0) not changed or undefined
        if (!selectedIndex) return;

        let targetCtgy;
        if (selectedIndex == allCtgy.length - 1) {
            // add new category
            targetCtgy = await this.callBack.inputCategory();
            if (!targetCtgy) return;

            if (!this.callBack.addCategory(targetCtgy)) {
                $ui.warning('添加新类别失败，可能与已有类别名重复');
                return;
            } else {
                this.callBack.changeCategoryById(data.id, targetCtgy);
                this.callBack.reloadCategory();
            }
        } else {
            targetCtgy = allCtgy[selectedIndex];
            // change to target category
            this.callBack.changeCategoryById(data.id, targetCtgy);
        }

        let currListCtgy = this.callBack.getCurrentCategory();
        if (currListCtgy) {
            sender.delete(indexPath);
            this.data.splice(indexPath.row, 1);
        } else this.data[indexPath.row].memInfo.category = targetCtgy;
        $ui.success('修改成功');
    }

    changeContent(sender, indexPath, data) {
        this.callBack.changeContentById(data.id).then((newMemInfo) => {
            if (data.memInfo.category == newMemInfo.category) {
                // category not changed
                data.memInfo = newMemInfo;
                data.memory_desc.text = newMemInfo.desc;
                // data.snapshot.src = newMemInfo.sPath;
                data.snapshotLoaded = false;

                this.data[indexPath.row] = data;
                this.updateListData();
                // sender.data = this.data;
            } else {
                // category also changed
                this.callBack.reloadCategory();

                let currCtgy = this.callBack.getCurrentCategory();
                if (currCtgy) {
                    sender.delete(indexPath);
                    this.data.splice(indexPath.row, 1);
                } else
                    this.data[indexPath.row].memInfo.category =
                        newMemInfo.category;
            }
        }); // Promise.then
    } // changeContent

    updateListData() {
        $(this.id).data = this.data;

        const mListOc = $(this.id).ocValue();
        for (let row = 0; row < this.data.length; row++) {
            const item = this.data[row];
            const {
                id: idBeforeLoad,
                snapshotLoaded,
                memInfo: { sPath: path },
            } = item;

            if (snapshotLoaded) {
                continue;
            }

            this.callBack.loadResource(path).then(
                (_data) => {
                    const idAfterLoad = this.data[row].id;
                    if (
                        idAfterLoad !== idBeforeLoad ||
                        this.data[row].snapshotLoaded
                    ) {
                        return;
                    }

                    const snapshotOc = mListOc
                        .$data()
                        .$objectAtIndex(row)
                        .$valueForKey('snapshot');
                    snapshotOc.$removeObjectForKey('symbol');
                    snapshotOc.$setValue_forKey(path, 'src');
                    snapshotOc.$setValue_forKey(
                        $contentMode.scaleToFill,
                        'contentMode'
                    );
                    mListOc.$reloadData();

                    delete item.snapshot.symbol;
                    // item.snapshot.data = data;
                    item.snapshot.src = path;
                    item.snapshot.contentMode = $contentMode.scaleToFill;
                    item.snapshotLoaded = true;
                },
                (err) => {
                    const idAfterLoad = this.data[row].id;
                    if (
                        idAfterLoad !== idBeforeLoad ||
                        this.data[row].snapshotLoaded
                    ) {
                        return;
                    }

                    console.error('Load snapshot failed.');
                    console.error(err);

                    const snapshotOc = mListOc
                        .$data()
                        .$objectAtIndex(row)
                        .$valueForKey('snapshot');
                    snapshotOc.$removeObjectForKey('src');
                    snapshotOc.$setValue_forKey(
                        'exclamationmark.icloud',
                        'symbol'
                    );
                    snapshotOc.$setValue_forKey(
                        $contentMode.center,
                        'contentMode'
                    );
                    mListOc.$reloadData();

                    // delete item.snapshot.data
                    delete item.snapshot.src;
                    item.snapshot.symbol = 'exclamationmark.icloud';
                    item.snapshot.contentMode = $contentMode.center;
                    item.snapshotLoaded = false;
                }
            );
        }
    }

    categorySwitched() {
        this.nextPage = 0;
        this.data = this.getNextPageData();
        this.updateListData();
    }

    categoryRenamed(oldName, newName) {
        if (this.callBack.getCurrentCategory() == oldName) {
            for (const item of this.data) {
                item.memInfo.category = newName;
            }
        } else if (this.callBack.getCurrentCategory() === null) {
            for (const item of this.data) {
                if (item.memInfo.category === oldName) {
                    item.memInfo.category = newName;
                }
            }
        }
    }

    // methods
    getNextPageData() {
        const DEGREE_COLORS = [
            $color('#ff0000'),
            $color('#ff0077'),
            $color('#ff00ff'),
            $color('#7700ff'),
            $color('#0000ff'),
            $color('#00ccff'),
            $color('#00ffff'),
            $color('#00ff00'),
        ];
        let newMemory = this.callBack.getMemoryByPage(
            this.nextPage++,
            this.pageSize,
            this.callBack.getCurrentCategory()
        );
        if (!newMemory) this.nextPage--;
        let newData = [];
        for (const mem of newMemory) {
            newData.push({
                // for saving data
                id: mem.id,
                memInfo: mem.memInfo,
                snapshotLoaded: false,

                // for template
                snapshot: {
                    symbol: 'icloud',
                    contentMode: $contentMode.center,
                },
                memory_desc: {
                    text: mem.memInfo.desc,
                },
                degree_indicator: {
                    bgcolor: DEGREE_COLORS[mem.degree],
                },
                detailed_info: {
                    text: mem.detailedInfo,
                },
            });
        } // for
        return newData;
    } // loadNextPage

    quickLook(contentType, path) {
        //TODO: prevent interaction while loading
        $ui.loading(true);
        this.callBack
            .loadResource(path)
            .then(
                (data) => {
                    if (contentType == ContentType.image) {
                        $quicklook.open({
                            url:
                                'file://' +
                                $file.absolutePath(path).replace(' ', '%20'), // no space char
                        });
                    } else if (contentType == ContentType.markdown) {
                        let md = data.string;
                        let html = $text.markdownToHtml(md);
                        $quicklook.open({ html: html });
                    } else console.error('Error: unsupported content type.');
                },
                (err) => {
                    console.log(`Failed to preview content of path "${path}".`);
                    console.error(err);
                }
            )
            .finally(() => {
                $ui.loading(false);
            });
    } // quicklook

    refreshMemoryList() {
        $(this.id).beginRefreshing();
        $(this.headerId).text = '刷新中...';
        this.nextPage = 0;
        this.data = this.getNextPageData();
        this.updateListData();
        $delay(0.5, () => {
            $(this.id).endRefreshing();
            $(this.headerId).text = '所有记录';
        });
    }
} // class

module.exports = MemoryListView;
