import _ from "underscore";

export function getToolsLayout(tool_panel) {
    return _.map(tool_panel.get("layout").toJSON(), category => {
        return {
            ...category,
            panel_type: getPanelType(category),
            elems: _.map(category.elems, el => {
                const json = el.toJSON();
                json.panel_type = getPanelType(json);
                return json;
            })
        };
    });
}

export function filterToolsLayout(layout, results) {
    if (results) {
        return _.filter(
            _.map(layout, category => {
                return {
                    ...category,
                    elems: (filtered => {
                        return _.filter(filtered, (el, i) => {
                            if (el.panel_type == "label") {
                                return filtered[i + 1] && filtered[i + 1].panel_type == "tool";
                            } else {
                                return true;
                            }
                        });
                    })(
                        _.filter(category.elems, el => {
                            if (el.panel_type == "label") {
                                return true;
                            } else {
                                return results.includes(el.id);
                            }
                        })
                    )
                };
            }),
            category => {
                return category.elems.length || (category.panel_type == "tool" && results.includes(category.id));
            }
        );
    } else {
        return layout;
    }
}

export function getPanelType(el) {
    if (el.model_class.endsWith("ToolSection")) {
        return "section";
    }
    if (el.model_class.endsWith("ToolSectionLabel")) {
        return "label";
    }
    return "tool";
}
