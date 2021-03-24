const ContentType = {
    markdown: 0,
    image: 1,
};

class ContentView {
    constructor(id) {
        this.id = id;

        this.events = {};
        this.props = {
            id: id,
            clipsToBounds: true,
        };

        this.content = null;
        this.contentType;

        this.imageViewId = 'image_of_' + id;
        this.markdownViewId = 'markdown_of_' + id;

        this.imageView = {
            type: 'image',
            props: {
                id: this.imageViewId,
                contentMode: $contentMode.scaleAspectFill,
                hidden: true,
            },
            layout: $layout.fill,
        };
        this.markdownView = {
            type: 'markdown',
            props: {
                id: this.markdownViewId,
                userInteractionEnabled: false,
                hidden: true,
            },
            layout: $layout.fill,
        };

        this.toRender = {
            type: 'view',
            props: this.props,
            views: [/*placeholderView, */ this.imageView, this.markdownView],
            events: this.events,
        }; // toRender

        this.setEvents('tapped', () => {
            this.quickLook();
        });
    } // constructor

    setLayout(layout) {
        if (!$(this.id))
            if (typeof layout == 'function') {
                this.toRender.layout = layout;
                return true;
            } else console.error('Error: layout is not of function type.');
        else console.error('Error: this method must be called before render.');
        return false;
    }

    setEvents(eName, eHandler) {
        if (!$(this.id)) {
            this.events[eName] = eHandler;
            return true;
        }
        console.error('Error: this method must be called before render.');
        return false;
    } // setEvents

    setProps(pName, pVal) {
        if (!$(this.id)) {
            this.props[pName] = pVal;
            return true;
        }
        console.error('Error: this method must be called before render.');
        return false;
    }

    changeType(contentType) {
        if (contentType == ContentType.image) this.contentType = contentType;
        else if (contentType == ContentType.markdown)
            this.contentType = contentType;
        else {
            console.error('Error: unsupported content type.');
            return false;
        }
        return true;
    }

    hideByType() {
        if (this.contentType == ContentType.image) {
            $(this.markdownViewId).hidden = true;
            $(this.imageViewId).hidden = false;
        } else if (this.contentType == ContentType.markdown) {
            $(this.markdownViewId).hidden = false;
            $(this.imageViewId).hidden = true;
        } else {
            console.error('Error: unsupported content type.');
            return false;
        }
        return true;
    }

    changeContent(contentType, content) {
        if (!$(this.id)) {
            console.error('Error: this method must be called after render.');
            return false;
        }

        if (!content) {
            console.error('Error: no content.');
            return false;
        }

        if (this.changeType(contentType) && this.hideByType())
            if (this.contentType == ContentType.image) {
                if (typeof content != 'object') {
                    console.error('Error: content should be image.');
                    return false;
                }
                this.content = content;

                let currSize = $(this.id).size;
                let scale = $device.info.screen.scale;
                let realSize = $size(
                    currSize.width * scale,
                    currSize.height * scale
                );
                let resizedImage = $imagekit.scaleAspectFill(content, realSize);
                $(this.imageViewId).image = resizedImage;
                return true;
            } else if (this.contentType == ContentType.markdown) {
                if (typeof content != 'string') {
                    console.error('Error: content should be markdown.');
                    return false;
                }
                this.content = content;
                $(this.markdownViewId).content = content;
                return true;
            } else {
                console.error('Error: unsupported content type.');
                return false;
            }
        return false;
    } // changeContent

    quickLook() {
        if (this.content && this.contentType == ContentType.image) {
            $quicklook.open({ type: 'jpg', data: this.content.jpg(1) });
        } else if (this.content && this.contentType == ContentType.markdown) {
            let html = $text.markdownToHtml(this.content);
            $quicklook.open({ html: html });
            //            $ui.push({
            //                views: [
            //                    {
            //                        type: "markdown",
            //                        props: { content: this.content },
            //                        layout: $layout.fill
            //                    }
            //                ]
            //            })
        } else return false;
        return true;
    } // quickLook
} // class ContentView

module.exports = ContentView;
