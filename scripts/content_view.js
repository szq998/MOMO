const ContentType = {
    image: 0,
    markdown: 1
}

class ContentView {
    constructor(id, layout) {
        this.id = id

        this.events = {}
        this.props = {
            id: id,
            clipsToBounds: true
        }

        this.content = null
        this.contentType

        this.imageViewId = "image_of_" + id
        this.markdownViewId = "markdown_of_" + id

        let imageView = {
            type: "image",
            props: {
                id: this.imageViewId,
                hidden: true
            },
            layout: $layout.fill
        }
        let markdownView = {
            type: "markdown",
            props: {
                id: this.markdownViewId,
                userInteractionEnabled: false,
                hidden: true
            },
            layout: $layout.fill
        }

        this.toRender = {
            type: "view",
            props: this.props,
            views: [imageView, markdownView],
            layout: layout,
            events: this.events
        } // toRender

        this.setEvents("tapped", () => {
            this.quickLook()
        })
    } // constructor

    setEvents(eName, eHandler) {
        if (!$(this.id)) {
            this.events[eName] = eHandler
            return true
        }
        return false
    } // setEvents

    setProps(pName, pVal) {
        if (!$(this.id)) {
            this.props[pName] = pVal
            return true
        }
        return false
    }

    changeType(contentType) {
        if (contentType == ContentType.image) {
            this.contentType = contentType
            $(this.markdownViewId).hidden = true
            $(this.imageViewId).hidden = false
        } else if (contentType == ContentType.markdown) {
            this.contentType = contentType
            $(this.markdownViewId).hidden = false
            $(this.imageViewId).hidden = true
        } else {
            console.log("Error: unsupported content type.")
            return false
        }
        return true
    }

    showNoContent(contentType) {
        if ($(this.id)) {
            if (
                this.changeType(contentType) &&
                this.contentType == ContentType.image
            ) {
                this.content = null

                $(this.imageViewId).contentMode = 1
                $(this.imageViewId).image = $image("photo")
            } else if (
                this.changeType(contentType) &&
                this.contentType == ContentType.markdown
            ) {
                this.content = null
                
                $(this.imageViewId).hidden = false
                $(this.markdownViewId).hidden = true
                $(this.imageViewId).contentMode = 1
                $(this.imageViewId).image = $image("doc.richtext")
//                $(this.markdownViewId).content = `# <center>无内容</center>`
            } else {
                return false
            }
        } else {
            console.log("Error: this method must be called after render.")
            return false
        }
        return true
    }

    changeContent(contentType, content) {
        if ($(this.id)) {
            if (
                this.changeType(contentType) &&
                this.contentType == ContentType.image
            ) {
                if (typeof content != "object") {
                    console.log("Error: content is not of image type.")
                    return false
                }

                this.content = content

                let currSize = $(this.id).size
                let scale = $device.info.screen.scale
                let realSize = $size(
                    currSize.width * scale,
                    currSize.height * scale
                )
                let resizedImage = $imagekit.scaleAspectFill(content, realSize)

                $(this.imageViewId).contentMode = 2
                $(this.imageViewId).image = resizedImage
            } else if (
                this.changeType(contentType) &&
                this.contentType == ContentType.markdown
            ) {
                if (typeof content != "string") {
                    console.log("Error: content is not of markdown.")
                    return false
                }

                this.content = content
                $(this.markdownViewId).content = content
            } else {
                return false
            }
        } else {
            console.log("Error: this method must be called after render.")
            return false
        }
        return true
    } // changeContent

    quickLook() {
        if (this.content && this.contentType == ContentType.image) {
            $quicklook.open({ image: this.content })
        } else if (this.content && this.contentType == ContentType.markdown) {
            $ui.push({
                views: [
                    {
                        type: "markdown",
                        props: { content: this.content },
                        layout: $layout.fill
                    }
                ]
            })
        }
    } // quickLook
} // class ContentView

let cv = new ContentView("text", (make, view) => {
    make.size.equalTo($size(200, 200))
    make.center.equalTo(view.super)
})

cv.setEvents("longPressed", () => {
    //cv.changeContent(ContentType.markdown, `# <center>无内容</center>`)
    $(cv.imageViewId).contentMode = 1
    cv.showNoContent(ContentType.image)
    $(cv.imageViewId).contentMode = 1
})

cv.setEvents("doubleTapped", () => {
    //cv.changeContent(ContentType.image, $image("photo.fill"))
    cv.showNoContent(ContentType.markdown)
})

cv.setEvents("tapped", sender => {
    sender.relayout()
    cv.changeContent(ContentType.image, $image("photo"))
})

cv.setProps("borderWidth", 1)

$ui.render({
    views: [cv.toRender],
    events: {
        appeared: () => {
            console.log("appeared")
        }
    }
})