var app = {
    //model
    data: {
        "settings": {
            "bigFonts": false,
            "color": null
        },
        "selectedItem": "list",
        "items": [{
            "text": "Those who lack the courage will always find a philosophy to justify it. - Albert Camus"
        }, {
            "text": "You can discover more about a person in an hour of play than in a year of conversation. - Plato"
        }, {
            "text": "If people never did silly things nothing intelligent would ever get done. - Ludwig Wittgenstein"
        }]
    },
    randomizeColor: function() {
        this.onchange("color", "rgb(0, " + (Math.random() * 125 | 0) + ", 0)")
    },
    reset: function() {
        this.onchange("bigFonts", false)
        this.onchange("color", null)
    },
    //controller
    controller: function() {
        this.data = app.data

        this.changeTab = function(name) {
            this.data.selectedItem = name
        }.bind(this)
        this.changeSetting = function(name, value) {
            this.data.settings[name] = value
        }.bind(this)
    },
    //view
    view: function(ctrl) {
        return m("div", {
            class: "app " + (ctrl.data.settings.bigFonts ? "big" : ""),
            style: {
                backgroundColor: ctrl.data.settings.color
            }
        }, [
            m(".tabs", [
                tabs({
                    selectedItem: ctrl.data.selectedItem,
                    onchange: ctrl.changeTab
                }),
            ]),
            app.choose(ctrl.data.selectedItem, {
                "list": list.bind(null, {
                    items: ctrl.data.items
                }),
                "settings": settings.bind(null, {
                    settings: ctrl.data.settings,
                    onchange: ctrl.changeSetting
                }),
                "about": function() {
                    return m(".about", [
                        "This is a sample demo",
                        m("hr"),
                        m("textarea", {
                            onchange: function() {
                                ctrl.data = JSON.parse(this.value);
                                console.log(ctrl.data)
                            }
                        }, JSON.stringify(ctrl.data))
                    ])
                }
            })
        ])
    }
}
var tabs = function(ctrl) {
    return m("ul", [
        m("li", [tab(ctrl, "list")]),
        m("li", [tab(ctrl, "settings")]),
        m("li", [tab(ctrl, "about")]),
    ])

}
var tab = function(ctrl, name) {
    return m("a", {
        class: ctrl.selectedItem == name ? "selected" : "",
        onclick: ctrl.onchange.bind(ctrl, name)
    }, name)
}
var list = function(ctrl) {
    return m("ul.itemlist", [
        ctrl.items.map(function(item) {
            return m("li", item.text)
        })
    ])
}
var settings = function(ctrl) {
    return m(".settings", [
        m("div", [
            m("input[type=checkbox]", {
                checked: ctrl.settings.bigFonts,
                onclick: ctrl.onchange.bind(ctrl, "bigFonts", !ctrl.settings.bigFonts)
            }),
            "big fonts"
        ]),
        m("div", [
            m("button", {
                onclick: app.randomizeColor.bind(ctrl)
            }, "random color")
        ]),
        m("div", [
            m("button", {
                onclick: app.reset.bind(ctrl)
            }, "reset")
        ])
    ])
}
app.choose = function(name, options) {
    return options[name]()
}

m.module(document.body, app)
