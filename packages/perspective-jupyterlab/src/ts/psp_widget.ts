/******************************************************************************
 *
 * Copyright (c) 2018, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

import "@finos/perspective-viewer";

import {Table, TableData} from "@finos/perspective";
import {Message} from "@lumino/messaging";
import {Widget} from "@lumino/widgets";
import {MIME_TYPE, PSP_CLASS, PSP_CONTAINER_CLASS, PSP_CONTAINER_CLASS_DARK} from "./utils";

import {HTMLPerspectiveViewerElement, Pivots, Aggregates, Sort, Expressions, PerspectiveViewerOptions, Filters, Columns} from "@finos/perspective-viewer";

let _increment = 0;

export interface PerspectiveWidgetOptions extends PerspectiveViewerOptions {
    dark?: boolean;
    client?: boolean;
    server?: boolean;
    title?: string;
    bindto?: HTMLElement;

    // these shouldn't exist, PerspectiveViewerOptions should be sufficient e.g.
    // ["row-pivots"]
    column_pivots?: Pivots;
    row_pivots?: Pivots;
    expressions?: Expressions;
    editable?: boolean;
}

/**
 * Class for perspective lumino widget.
 *
 * @class PerspectiveWidget (name) TODO: document
 */
export class PerspectiveWidget extends Widget {
    constructor(name = "Perspective", options: PerspectiveWidgetOptions = {}) {
        super({node: options.bindto || document.createElement("div")});
        this._viewer = PerspectiveWidget.createNode(this.node as HTMLDivElement);

        this.title.label = name;
        this.title.caption = `${name}`;
        this.id = `${name}-` + _increment;
        _increment += 1;

        this._set_attributes(options);
    }

    /**
     * Apply user-provided options to the widget.
     *
     * @param options
     */
    _set_attributes(options: PerspectiveViewerOptions & PerspectiveWidgetOptions): void {
        const plugin: string = options.plugin || "datagrid";
        const columns: Columns = options.columns || [];
        const row_pivots: Pivots = options.row_pivots || options["row-pivots"] || [];
        const column_pivots: Pivots = options.column_pivots || options["column-pivots"] || [];
        const aggregates: Aggregates = options.aggregates || {};
        const sort: Sort = options.sort || [];
        const filters: Filters = options.filters || [];
        const expressions: Expressions = options.expressions || options["expressions"] || [];
        const plugin_config: object = options.plugin_config || {};
        const dark: boolean = options.dark || false;
        const editable: boolean = options.editable || false;
        const server: boolean = options.server || false;
        const client: boolean = options.client || false;
        const selectable: boolean = options.selectable || false;

        this.server = server;
        this.client = client;
        this.dark = dark;
        this.editable = editable;
        this.plugin = plugin;
        this.plugin_config = plugin_config;
        this.row_pivots = row_pivots;
        this.column_pivots = column_pivots;
        this.sort = sort;
        this.columns = columns;
        this.selectable = selectable;

        // do aggregates after columns
        this.aggregates = aggregates;

        // do expressions last
        this.expressions = expressions;
        this.filters = filters;
    }

    /**********************/
    /* Lumino Overrides */
    /**********************/

    /**
     * Lumino: after visible
     *
     */
    onAfterShow(msg: Message): void {
        this.notifyResize();
        super.onAfterShow(msg);
    }

    /**
     * Lumino: widget resize
     *
     */
    onResize(msg: Widget.ResizeMessage): void {
        this.notifyResize();
        super.onResize(msg);
    }

    protected onActivateRequest(msg: Message): void {
        if (this.isAttached) {
            this.viewer.focus();
        }
        super.onActivateRequest(msg);
    }

    async notifyResize(): Promise<void> {
        if (this.isVisible) {
            await this.viewer.notifyResize();
        }
    }

    async toggleConfig(): Promise<void> {
        if (this.isVisible) {
            await this.viewer.toggleConfig();
        }
    }

    async save(): Promise<PerspectiveViewerOptions> {
        return await this.viewer.save();
    }

    async restore(config: PerspectiveViewerOptions): Promise<void> {
        return await this.viewer.restore(config);
    }

    /**
     * Load a `perspective.table` into the viewer.
     *
     * @param table A `perspective.table` object.
     */
    async load(table: Table): Promise<void> {
        await this.viewer.load(table);
    }

    /**
     * Update the viewer with new data.
     *
     * @param data
     */
    _update(data: TableData): void {
        this.viewer.table.update(data);
    }

    /**
     * Removes all rows from the viewer's table. Does not reset viewer state.
     */
    async clear(): Promise<void> {
        await this.viewer.table.clear();
    }

    /**
     * Replaces the data of the viewer's table with new data. New data must
     * conform to the schema of the Table.
     *
     * @param data
     */
    async replace(data: TableData): Promise<void> {
        await this.viewer.table.replace(data);
    }

    /**
     * Deletes this element's data and clears it's internal state (but not its
     * user state). This (or the underlying `perspective.table`'s equivalent
     * method) must be called in order for its memory to be reclaimed.
     */
    delete(): void {
        this.viewer.delete();
    }

    /**
     * Returns a promise that resolves to the element's edit port ID, used
     * internally when edits are made using datagrid in client/server mode.
     */
    async getEditPort(): Promise<number> {
        return await this.viewer.getEditPort();
    }

    get table(): Table {
        return this.viewer.table;
    }

    /***************************************************************************
     *
     * Getters
     *
     */

    /**
     * Returns the underlying `PerspectiveViewer` instance.
     *
     * @returns {PerspectiveViewer} The widget's viewer instance.
     */
    get viewer(): HTMLPerspectiveViewerElement {
        return this._viewer;
    }

    /**
     * Returns the name of the widget.
     *
     * @returns {string} the widget name - "Perspective" if not set by the user.
     */
    get name(): string {
        return this.title.label;
    }

    /**
     * The name of the plugin which visualizes the data in `PerspectiveViewer`.
     *
     */
    get plugin(): string {
        return this.viewer.getAttribute("plugin");
    }
    set plugin(plugin: string) {
        this.viewer.setAttribute("plugin", plugin);
    }

    /**
     * The column names that are displayed in the viewer's grid/visualizations.
     *
     * If a column in the dataset is not in this array, it is not shown but can
     * be used for aggregates, sort, and filter.
     */
    get columns(): Columns {
        return JSON.parse(this.viewer.getAttribute("columns"));
    }
    set columns(columns: Columns) {
        if (columns.length > 0) {
            this.viewer.setAttribute("columns", JSON.stringify(columns));
        } else {
            this.viewer.removeAttribute("columns");
        }
    }

    get row_pivots(): Pivots {
        return JSON.parse(this.viewer.getAttribute("row-pivots"));
    }
    set row_pivots(row_pivots: Pivots) {
        this.viewer.setAttribute("row-pivots", JSON.stringify(row_pivots));
    }

    get column_pivots(): Pivots {
        return JSON.parse(this.viewer.getAttribute("column-pivots"));
    }
    set column_pivots(column_pivots: Pivots) {
        this.viewer.setAttribute("column-pivots", JSON.stringify(column_pivots));
    }

    get aggregates(): Aggregates {
        return JSON.parse(this.viewer.getAttribute("aggregates"));
    }
    set aggregates(aggregates: Aggregates) {
        this.viewer.setAttribute("aggregates", JSON.stringify(aggregates));
    }

    get sort(): Sort {
        return JSON.parse(this.viewer.getAttribute("sort"));
    }
    set sort(sort: Sort) {
        this.viewer.setAttribute("sort", JSON.stringify(sort));
    }

    get expressions(): Expressions {
        return JSON.parse(this.viewer.getAttribute("expressions"));
    }
    set expressions(expressions: Expressions) {
        if (expressions.length > 0) {
            this.viewer.setAttribute("expressions", JSON.stringify(expressions));
        } else {
            this.viewer.removeAttribute("expressions");
        }
    }

    get filters(): Filters {
        return JSON.parse(this.viewer.getAttribute("filters"));
    }
    set filters(filters: Filters) {
        if (filters.length > 0) {
            this.viewer.setAttribute("filters", JSON.stringify(filters));
        } else {
            this.viewer.removeAttribute("filters");
        }
    }

    // `plugin_config` cannot be synchronously read from the viewer, as it is
    // not part of the attribute API and only emitted from save(). Users can
    // pass in a plugin config and have it applied to the viewer, but they
    // cannot read the current `plugin_config` of the viewer if it has not
    // already been set from Python.
    get plugin_config(): object {
        return this._plugin_config;
    }
    set plugin_config(plugin_config: object) {
        this._plugin_config = plugin_config;

        // Allow plugin configs passed from Python to take effect on the viewer
        if (this._plugin_config) {
            this.viewer.restore({plugin_config: this._plugin_config});
        }
    }

    /**
     * True if the widget is in client-only mode, i.e. the browser has ownership
     * of the widget's data.
     */
    get client(): boolean {
        return this._client;
    }
    set client(client: boolean) {
        this._client = client;
    }

    /**
     * True if the widget is in server-only mode, i.e. the Python backend has
     * full ownership of the widget's data, and the widget does not have a
     * `perspective.Table` of its own.
     */
    get server(): boolean {
        return this._server;
    }
    set server(server: boolean) {
        this._server = server;
    }

    /**
     * Enable or disable dark mode by re-rendering the viewer.
     */
    get dark(): boolean {
        return this._dark;
    }
    set dark(dark: boolean) {
        this._dark = dark;
        if (this._dark) {
            this.node.classList.add(PSP_CONTAINER_CLASS_DARK);
            this.node.classList.remove(PSP_CONTAINER_CLASS);
        } else {
            this.node.classList.add(PSP_CONTAINER_CLASS);
            this.node.classList.remove(PSP_CONTAINER_CLASS_DARK);
        }
        if (this.isAttached) {
            this.viewer.restyleElement();
        }
    }

    get editable(): boolean {
        return this._editable;
    }
    set editable(editable: boolean) {
        this._editable = editable;
        if (this._editable) {
            this.viewer.setAttribute("editable", "");
        } else {
            this.viewer.removeAttribute("editable");
        }
    }

    get selectable(): boolean {
        return this.viewer.hasAttribute("selectable");
    }

    set selectable(row_selection: boolean) {
        if (row_selection) {
            this.viewer.setAttribute("selectable", "");
        } else {
            this.viewer.removeAttribute("selectable");
        }
    }

    static createNode(node: HTMLDivElement): HTMLPerspectiveViewerElement {
        node.classList.add("p-Widget");
        node.classList.add(PSP_CONTAINER_CLASS);
        const viewer = document.createElement("perspective-viewer");
        viewer.classList.add(PSP_CLASS);
        viewer.setAttribute("type", MIME_TYPE);

        while (node.lastChild) {
            node.removeChild(node.lastChild);
        }

        node.appendChild(viewer);

        // allow perspective's event handlers to do their work
        viewer.addEventListener("contextmenu", event => event.stopPropagation(), false);

        const div = document.createElement("div");
        div.style.setProperty("display", "flex");
        div.style.setProperty("flex-direction", "row");
        node.appendChild(div);

        if (!viewer.notifyResize) {
            console.warn("Warning: not bound to real element");
        } else {
            const resize_observer = new MutationObserver(mutations => {
                if (mutations.some(x => x.attributeName === "style")) {
                    viewer.notifyResize.call(viewer);
                }
            });
            resize_observer.observe(node, {attributes: true});
            viewer.toggleConfig();
        }

        return viewer;
    }

    private _viewer: HTMLPerspectiveViewerElement;
    private _plugin_config: object;
    private _client: boolean;
    private _server: boolean;
    private _dark: boolean;
    private _editable: boolean;
}
