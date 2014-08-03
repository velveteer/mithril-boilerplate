(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
Mithril = m = new function app(window) {
	var type = {}.toString
	var parser = /(?:(^|#|\.)([^#\.\[\]]+))|(\[.+?\])/g, attrParser = /\[(.+?)(?:=("|'|)(.*?)\2)?\]/
	
	function m() {
		var args = arguments
		var hasAttrs = type.call(args[1]) == "[object Object]" && !("tag" in args[1]) && !("subtree" in args[1])
		var attrs = hasAttrs ? args[1] : {}
		var classAttrName = "class" in attrs ? "class" : "className"
		var cell = {tag: "div", attrs: {}}
		var match, classes = []
		while (match = parser.exec(args[0])) {
			if (match[1] == "") cell.tag = match[2]
			else if (match[1] == "#") cell.attrs.id = match[2]
			else if (match[1] == ".") classes.push(match[2])
			else if (match[3][0] == "[") {
				var pair = attrParser.exec(match[3])
				cell.attrs[pair[1]] = pair[3] || (pair[2] ? "" :true)
			}
		}
		if (classes.length > 0) cell.attrs[classAttrName] = classes.join(" ")
		
		cell.children = hasAttrs ? args[2] : args[1]
		
		for (var attrName in attrs) {
			if (attrName == classAttrName) cell.attrs[attrName] = (cell.attrs[attrName] || "") + " " + attrs[attrName]
			else cell.attrs[attrName] = attrs[attrName]
		}
		return cell
	}
	function build(parentElement, parentTag, parentCache, parentIndex, data, cached, shouldReattach, index, editable, namespace, configs) {
		if (data === null || data === undefined) data = ""
		if (data.subtree === "retain") return cached

		var cachedType = type.call(cached), dataType = type.call(data)
		if (cachedType != dataType) {
			if (cached !== null && cached !== undefined) {
				if (parentCache && parentCache.nodes) {
					var offset = index - parentIndex
					var end = offset + (dataType == "[object Array]" ? data : cached.nodes).length
					clear(parentCache.nodes.slice(offset, end), parentCache.slice(offset, end))
				}
				else clear(cached.nodes, cached)
			}
			cached = new data.constructor
			cached.nodes = []
		}

		if (dataType == "[object Array]") {
			data = flatten(data)
			var nodes = [], intact = cached.length === data.length, subArrayCount = 0
			
			var DELETION = 1, INSERTION = 2 , MOVE = 3
			var existing = {}, unkeyed = [], shouldMaintainIdentities = false
			for (var i = 0; i < cached.length; i++) {
				if (cached[i] && cached[i].attrs && cached[i].attrs.key !== undefined) {
					shouldMaintainIdentities = true
					existing[cached[i].attrs.key] = {action: DELETION, index: i}
				}
			}
			if (shouldMaintainIdentities) {
				for (var i = 0; i < data.length; i++) {
					if (data[i] && data[i].attrs) {
						if (data[i].attrs.key !== undefined) {
							var key = data[i].attrs.key
							if (!existing[key]) existing[key] = {action: INSERTION, index: i}
							else existing[key] = {action: MOVE, index: i, from: existing[key].index, element: parentElement.childNodes[existing[key].index]}
						}
						else unkeyed.push({index: i, element: parentElement.childNodes[i]})
					}
				}
				var actions = Object.keys(existing).map(function(key) {return existing[key]})
				var changes = actions.sort(function(a, b) {return a.action - b.action || a.index - b.index})
				var newCached = cached.slice()
				
				for (var i = 0, change; change = changes[i]; i++) {
					if (change.action == DELETION) {
						clear(cached[change.index].nodes, cached[change.index])
						newCached.splice(change.index, 1)
					}
					if (change.action == INSERTION) {
						var dummy = window.document.createElement("div")
						dummy.key = data[change.index].attrs.key
						parentElement.insertBefore(dummy, parentElement.childNodes[change.index])
						newCached.splice(change.index, 0, {attrs: {key: data[change.index].attrs.key}, nodes: [dummy]})
					}
					
					if (change.action == MOVE) {
						if (parentElement.childNodes[change.index] !== change.element) {
							parentElement.insertBefore(change.element, parentElement.childNodes[change.index])
						}
						newCached[change.index] = cached[change.from]
					}
				}
				for (var i = 0; i < unkeyed.length; i++) {
					var change = unkeyed[i]
					parentElement.insertBefore(change.element, parentElement.childNodes[change.index])
					newCached[change.index] = cached[change.index]
				}
				cached = newCached
				cached.nodes = []
				for (var i = 0, child; child = parentElement.childNodes[i]; i++) cached.nodes.push(child)
			}
			
			for (var i = 0, cacheCount = 0; i < data.length; i++) {
				var item = build(parentElement, parentTag, cached, index, data[i], cached[cacheCount], shouldReattach, index + subArrayCount || subArrayCount, editable, namespace, configs)
				if (item === undefined) continue
				if (!item.nodes.intact) intact = false
				var isArray = item instanceof Array
				subArrayCount += isArray ? item.length : 1
				cached[cacheCount++] = item
			}
			if (!intact) {
				for (var i = 0; i < data.length; i++) {
					if (cached[i] !== undefined) nodes = nodes.concat(cached[i].nodes)
				}
				for (var i = 0, node; node = cached.nodes[i]; i++) {
					if (node.parentNode !== null && nodes.indexOf(node) < 0) node.parentNode.removeChild(node)
				}
				for (var i = cached.nodes.length, node; node = nodes[i]; i++) {
					if (node.parentNode === null) parentElement.appendChild(node)
				}
				if (data.length < cached.length) cached.length = data.length
				cached.nodes = nodes
			}
			
		}
		else if (dataType == "[object Object]") {
			if (data.tag != cached.tag || Object.keys(data.attrs).join() != Object.keys(cached.attrs).join() || data.attrs.id != cached.attrs.id) {
				clear(cached.nodes)
				if (cached.configContext && typeof cached.configContext.onunload == "function") cached.configContext.onunload()
			}
			if (typeof data.tag != "string") return

			var node, isNew = cached.nodes.length === 0
			if (data.attrs.xmlns) namespace = data.attrs.xmlns
			else if (data.tag === "svg") namespace = "http://www.w3.org/2000/svg"
			if (isNew) {
				node = namespace === undefined ? window.document.createElement(data.tag) : window.document.createElementNS(namespace, data.tag)
				cached = {
					tag: data.tag,
					//process children before attrs so that select.value works correctly
					children: data.children !== undefined ? build(node, data.tag, undefined, undefined, data.children, cached.children, true, 0, data.attrs.contenteditable ? node : editable, namespace, configs) : undefined,
					attrs: setAttributes(node, data.tag, data.attrs, {}, namespace),
					nodes: [node]
				}
				parentElement.insertBefore(node, parentElement.childNodes[index] || null)
			}
			else {
				node = cached.nodes[0]
				setAttributes(node, data.tag, data.attrs, cached.attrs, namespace)
				cached.children = build(node, data.tag, undefined, undefined, data.children, cached.children, false, 0, data.attrs.contenteditable ? node : editable, namespace, configs)
				cached.nodes.intact = true
				if (shouldReattach === true) parentElement.insertBefore(node, parentElement.childNodes[index] || null)
			}
			if (type.call(data.attrs["config"]) == "[object Function]") {
				configs.push(data.attrs["config"].bind(window, node, !isNew, cached.configContext = cached.configContext || {}, cached))
			}
		}
		else {
			var nodes
			if (cached.nodes.length === 0) {
				if (data.$trusted) {
					nodes = injectHTML(parentElement, index, data)
				}
				else {
					nodes = [window.document.createTextNode(data)]
					parentElement.insertBefore(nodes[0], parentElement.childNodes[index] || null)
				}
				cached = "string number boolean".indexOf(typeof data) > -1 ? new data.constructor(data) : data
				cached.nodes = nodes
			}
			else if (cached.valueOf() !== data.valueOf() || shouldReattach === true) {
				nodes = cached.nodes
				if (!editable || editable !== window.document.activeElement) {
					if (data.$trusted) {
						clear(nodes, cached)
						nodes = injectHTML(parentElement, index, data)
					}
					else {
						if (parentTag === "textarea") parentElement.value = data
						else if (editable) editable.innerHTML = data
						else {
							if (nodes[0].nodeType == 1 || nodes.length > 1) { //was a trusted string
								clear(cached.nodes, cached)
								nodes = [window.document.createTextNode(data)]
							}
							parentElement.insertBefore(nodes[0], parentElement.childNodes[index] || null)
							nodes[0].nodeValue = data
						}
					}
				}
				cached = new data.constructor(data)
				cached.nodes = nodes
			}
			else cached.nodes.intact = true
		}

		return cached
	}
	function setAttributes(node, tag, dataAttrs, cachedAttrs, namespace) {
		var groups = {}
		for (var attrName in dataAttrs) {
			var dataAttr = dataAttrs[attrName]
			var cachedAttr = cachedAttrs[attrName]
			if (!(attrName in cachedAttrs) || (cachedAttr !== dataAttr) || node === window.document.activeElement) {
				cachedAttrs[attrName] = dataAttr
				if (attrName === "config") continue
				else if (typeof dataAttr == "function" && attrName.indexOf("on") == 0) {
					node[attrName] = autoredraw(dataAttr, node)
				}
				else if (attrName === "style" && typeof dataAttr == "object") {
					for (var rule in dataAttr) {
						if (cachedAttr === undefined || cachedAttr[rule] !== dataAttr[rule]) node.style[rule] = dataAttr[rule]
					}
					for (var rule in cachedAttr) {
						if (!(rule in dataAttr)) node.style[rule] = ""
					}
				}
				else if (namespace !== undefined) {
					if (attrName === "href") node.setAttributeNS("http://www.w3.org/1999/xlink", "href", dataAttr)
					else if (attrName === "className") node.setAttribute("class", dataAttr)
					else node.setAttribute(attrName, dataAttr)
				}
				else if (attrName === "value" && tag === "input") {
					if (node.value !== dataAttr) node.value = dataAttr
				}
				else if (attrName in node && !(attrName == "list" || attrName == "style")) {
					node[attrName] = dataAttr
				}
				else node.setAttribute(attrName, dataAttr)
			}
		}
		return cachedAttrs
	}
	function clear(nodes, cached) {
		for (var i = nodes.length - 1; i > -1; i--) {
			if (nodes[i] && nodes[i].parentNode) {
				nodes[i].parentNode.removeChild(nodes[i])
				cached = [].concat(cached)
				if (cached[i]) unload(cached[i])
			}
		}
		if (nodes.length != 0) nodes.length = 0
	}
	function unload(cached) {
		if (cached.configContext && typeof cached.configContext.onunload == "function") cached.configContext.onunload()
		if (cached.children) {
			if (cached.children instanceof Array) for (var i = 0; i < cached.children.length; i++) unload(cached.children[i])
			else if (cached.children.tag) unload(cached.children)
		}
	}
	function injectHTML(parentElement, index, data) {
		var nextSibling = parentElement.childNodes[index]
		if (nextSibling) {
			var isElement = nextSibling.nodeType != 1
			var placeholder = window.document.createElement("span")
			if (isElement) {
				parentElement.insertBefore(placeholder, nextSibling)
				placeholder.insertAdjacentHTML("beforebegin", data)
				parentElement.removeChild(placeholder)
			}
			else nextSibling.insertAdjacentHTML("beforebegin", data)
		}
		else parentElement.insertAdjacentHTML("beforeend", data)
		var nodes = []
		while (parentElement.childNodes[index] !== nextSibling) {
			nodes.push(parentElement.childNodes[index])
			index++
		}
		return nodes
	}
	function flatten(data) {
		var flattened = []
		for (var i = 0; i < data.length; i++) {
			var item = data[i]
			if (item instanceof Array) flattened.push.apply(flattened, flatten(item))
			else flattened.push(item)
		}
		return flattened
	}
	function autoredraw(callback, object, group) {
		return function(e) {
			e = e || event
			m.startComputation()
			try {return callback.call(object, e)}
			finally {
				if (!lastRedrawId) lastRedrawId = -1;
				m.endComputation()
			}
		}
	}

	var html
	var documentNode = {
		insertAdjacentHTML: function(_, data) {
			window.document.write(data)
			window.document.close()
		},
		appendChild: function(node) {
			if (html === undefined) html = window.document.createElement("html")
			if (node.nodeName == "HTML") html = node
			else html.appendChild(node)
			if (window.document.documentElement && window.document.documentElement !== html) {
				window.document.replaceChild(html, window.document.documentElement)
			}
			else window.document.appendChild(html)
		},
		insertBefore: function(node) {
			this.appendChild(node)
		},
		childNodes: []
	}
	var nodeCache = [], cellCache = {}
	m.render = function(root, cell) {
		var configs = []
		if (!root) throw new Error("Please ensure the DOM element exists before rendering a template into it.")
		var id = getCellCacheKey(root)
		var node = root == window.document || root == window.document.documentElement ? documentNode : root
		if (cellCache[id] === undefined) clear(node.childNodes)
		cellCache[id] = build(node, null, undefined, undefined, cell, cellCache[id], false, 0, null, undefined, configs)
		for (var i = 0; i < configs.length; i++) configs[i]()
	}
	function getCellCacheKey(element) {
		var index = nodeCache.indexOf(element)
		return index < 0 ? nodeCache.push(element) - 1 : index
	}

	m.trust = function(value) {
		value = new String(value)
		value.$trusted = true
		return value
	}

	var roots = [], modules = [], controllers = [], lastRedrawId = 0, computePostRedrawHook = null
	m.module = function(root, module) {
		var index = roots.indexOf(root)
		if (index < 0) index = roots.length
		var isPrevented = false
		if (controllers[index] && typeof controllers[index].onunload == "function") {
			var event = {
				preventDefault: function() {isPrevented = true}
			}
			controllers[index].onunload(event)
		}
		if (!isPrevented) {
			m.startComputation()
			roots[index] = root
			modules[index] = module
			controllers[index] = new module.controller
			m.endComputation()
		}
	}
	m.redraw = function() {
		var cancel = window.cancelAnimationFrame || window.clearTimeout
		var defer = window.requestAnimationFrame || window.setTimeout
		if (lastRedrawId) {
			cancel(lastRedrawId)
			lastRedrawId = defer(redraw, 0)
		}
		else {
			redraw()
			lastRedrawId = defer(function() {lastRedrawId = null}, 0)
		}
	}
	function redraw() {
		for (var i = 0; i < roots.length; i++) {
			if (controllers[i]) m.render(roots[i], modules[i].view(controllers[i]))
		}
		if (computePostRedrawHook) {
			computePostRedrawHook()
			computePostRedrawHook = null
		}
		lastRedrawId = null
	}

	var pendingRequests = 0
	m.startComputation = function() {pendingRequests++}
	m.endComputation = function() {
		pendingRequests = Math.max(pendingRequests - 1, 0)
		if (pendingRequests == 0) m.redraw()
	}

	m.withAttr = function(prop, withAttrCallback) {
		return function(e) {
			e = e || event
			withAttrCallback(prop in e.currentTarget ? e.currentTarget[prop] : e.currentTarget.getAttribute(prop))
		}
	}

	//routing
	var modes = {pathname: "", hash: "#", search: "?"}
	var redirect = function() {}, routeParams = {}, currentRoute
	m.route = function() {
		if (arguments.length === 0) return currentRoute
		else if (arguments.length === 3 && typeof arguments[1] == "string") {
			var root = arguments[0], defaultRoute = arguments[1], router = arguments[2]
			redirect = function(source) {
				var path = currentRoute = normalizeRoute(source)
				if (!routeByValue(root, router, path)) {
					m.route(defaultRoute, true)
				}
			}
			var listener = m.route.mode == "hash" ? "onhashchange" : "onpopstate"
			window[listener] = function() {
				if (currentRoute != normalizeRoute(window.location[m.route.mode])) {
					redirect(window.location[m.route.mode])
				}
			}
			computePostRedrawHook = setScroll
			window[listener]()
		}
		else if (arguments[0].addEventListener) {
			var element = arguments[0]
			var isInitialized = arguments[1]
			if (element.href.indexOf(modes[m.route.mode]) < 0) {
				element.href = window.location.pathname + modes[m.route.mode] + element.pathname
			}
			if (!isInitialized) {
				element.removeEventListener("click", routeUnobtrusive)
				element.addEventListener("click", routeUnobtrusive)
			}
		}
		else if (typeof arguments[0] == "string") {
			currentRoute = arguments[0]
			var querystring = typeof arguments[1] == "object" ? buildQueryString(arguments[1]) : null
			if (querystring) currentRoute += (currentRoute.indexOf("?") === -1 ? "?" : "&") + querystring

			var shouldReplaceHistoryEntry = (arguments.length == 3 ? arguments[2] : arguments[1]) === true
			
			if (window.history.pushState) {
				computePostRedrawHook = function() {
					window.history[shouldReplaceHistoryEntry ? "replaceState" : "pushState"](null, window.document.title, modes[m.route.mode] + currentRoute)
					setScroll()
				}
				redirect(modes[m.route.mode] + currentRoute)
			}
			else window.location[m.route.mode] = currentRoute
		}
	}
	m.route.param = function(key) {return routeParams[key]}
	m.route.mode = "search"
	function normalizeRoute(route) {return route.slice(modes[m.route.mode].length)}
	function routeByValue(root, router, path) {
		routeParams = {}

		var queryStart = path.indexOf("?")
		if (queryStart !== -1) {
			routeParams = parseQueryString(path.substr(queryStart + 1, path.length))
			path = path.substr(0, queryStart)
		}

		for (var route in router) {
			if (route == path) {
				reset(root)
				m.module(root, router[route])
				return true
			}

			var matcher = new RegExp("^" + route.replace(/:[^\/]+?\.{3}/g, "(.*?)").replace(/:[^\/]+/g, "([^\\/]+)") + "\/?$")

			if (matcher.test(path)) {
				reset(root)
				path.replace(matcher, function() {
					var keys = route.match(/:[^\/]+/g) || []
					var values = [].slice.call(arguments, 1, -2)
					for (var i = 0; i < keys.length; i++) routeParams[keys[i].replace(/:|\./g, "")] = decodeSpace(values[i])
					m.module(root, router[route])
				})
				return true
			}
		}
	}
	function reset(root) {
		var cacheKey = getCellCacheKey(root)
		clear(root.childNodes, cellCache[cacheKey])
		cellCache[cacheKey] = undefined
	}
	function routeUnobtrusive(e) {
		e = e || event
		if (e.ctrlKey || e.metaKey || e.which == 2) return
		e.preventDefault()
		m.route(e.currentTarget[m.route.mode].slice(modes[m.route.mode].length))
	}
	function setScroll() {
		if (m.route.mode != "hash" && window.location.hash) window.location.hash = window.location.hash
		else window.scrollTo(0, 0)
	}
	function buildQueryString(object, prefix) {
		var str = []
		for(var prop in object) {
			var key = prefix ? prefix + "[" + prop + "]" : prop, value = object[prop]
			str.push(typeof value == "object" ? buildQueryString(value, key) : encodeURIComponent(key) + "=" + encodeURIComponent(value))
		}
		return str.join("&")
	}
	function parseQueryString(str) {
		var pairs = str.split("&"), params = {}
		for (var i = 0; i < pairs.length; i++) {
			var pair = pairs[i].split("=")
			params[decodeSpace(pair[0])] = pair[1] ? decodeSpace(pair[1]) : (pair.length === 1 ? true : "")
		}
		return params
	}
	function decodeSpace(string) {
		return decodeURIComponent(string.replace(/\+/g, " "))
	}

	//model
	m.prop = function(store) {
		var prop = function() {
			if (arguments.length) store = arguments[0]
			return store
		}
		prop.toJSON = function() {
			return store
		}
		return prop
	}

	var none = {}
	m.deferred = function() {
		var resolvers = [], rejecters = [], resolved = none, rejected = none, promise = m.prop()
		var object = {
			resolve: function(value) {
				if (resolved === none) promise(resolved = value)
				for (var i = 0; i < resolvers.length; i++) resolvers[i](value)
				resolvers.length = rejecters.length = 0
			},
			reject: function(value) {
				if (rejected === none) rejected = value
				for (var i = 0; i < rejecters.length; i++) rejecters[i](value)
				resolvers.length = rejecters.length = 0
			},
			promise: promise
		}
		object.promise.resolvers = resolvers
		object.promise.then = function(success, error) {
			var next = m.deferred()
			if (!success) success = identity
			if (!error) error = identity
			function callback(method, callback) {
				return function(value) {
					try {
						var result = callback(value)
						if (result && typeof result.then == "function") result.then(next[method], error)
						else next[method](result !== undefined ? result : value)
					}
					catch (e) {
						if (e instanceof Error && e.constructor !== Error) throw e
						else next.reject(e)
					}
				}
			}
			if (resolved !== none) callback("resolve", success)(resolved)
			else if (rejected !== none) callback("reject", error)(rejected)
			else {
				resolvers.push(callback("resolve", success))
				rejecters.push(callback("reject", error))
			}
			return next.promise
		}
		return object
	}
	m.sync = function(args) {
		var method = "resolve"
		function synchronizer(pos, resolved) {
			return function(value) {
				results[pos] = value
				if (!resolved) method = "reject"
				if (--outstanding == 0) {
					deferred.promise(results)
					deferred[method](results)
				}
				return value
			}
		}

		var deferred = m.deferred()
		var outstanding = args.length
		var results = new Array(outstanding)
		for (var i = 0; i < args.length; i++) {
			args[i].then(synchronizer(i, true), synchronizer(i, false))
		}
		return deferred.promise
	}
	function identity(value) {return value}

	function ajax(options) {
		var xhr = new window.XMLHttpRequest
		xhr.open(options.method, options.url, true, options.user, options.password)
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status >= 200 && xhr.status < 300) options.onload({type: "load", target: xhr})
				else options.onerror({type: "error", target: xhr})
			}
		}
		if (options.serialize == JSON.stringify && options.method != "GET") {
			xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
		}
		if (typeof options.config == "function") {
			var maybeXhr = options.config(xhr, options)
			if (maybeXhr !== undefined) xhr = maybeXhr
		}
		xhr.send(options.method == "GET" ? "" : options.data)
		return xhr
	}
	function bindData(xhrOptions, data, serialize) {
		if (data && Object.keys(data).length > 0) {
			if (xhrOptions.method == "GET") {
				xhrOptions.url = xhrOptions.url + (xhrOptions.url.indexOf("?") < 0 ? "?" : "&") + buildQueryString(data)
			}
			else xhrOptions.data = serialize(data)
		}
		return xhrOptions
	}
	function parameterizeUrl(url, data) {
		var tokens = url.match(/:[a-z]\w+/gi)
		if (tokens && data) {
			for (var i = 0; i < tokens.length; i++) {
				var key = tokens[i].slice(1)
				url = url.replace(tokens[i], data[key])
				delete data[key]
			}
		}
		return url
	}

	m.request = function(xhrOptions) {
		if (xhrOptions.background !== true) m.startComputation()
		var deferred = m.deferred()
		var serialize = xhrOptions.serialize = xhrOptions.serialize || JSON.stringify
		var deserialize = xhrOptions.deserialize = xhrOptions.deserialize || JSON.parse
		var extract = xhrOptions.extract || function(xhr) {
			return xhr.responseText.length === 0 && deserialize === JSON.parse ? null : xhr.responseText
		}
		xhrOptions.url = parameterizeUrl(xhrOptions.url, xhrOptions.data)
		xhrOptions = bindData(xhrOptions, xhrOptions.data, serialize)
		xhrOptions.onload = xhrOptions.onerror = function(e) {
			try {
				e = e || event
				var unwrap = (e.type == "load" ? xhrOptions.unwrapSuccess : xhrOptions.unwrapError) || identity
				var response = unwrap(deserialize(extract(e.target, xhrOptions)))
				if (e.type == "load") {
					if (response instanceof Array && xhrOptions.type) {
						for (var i = 0; i < response.length; i++) response[i] = new xhrOptions.type(response[i])
					}
					else if (xhrOptions.type) response = new xhrOptions.type(response)
				}
				deferred[e.type == "load" ? "resolve" : "reject"](response)
			}
			catch (e) {
				if (e instanceof SyntaxError) throw new SyntaxError("Could not parse HTTP response. See http://lhorie.github.io/mithril/mithril.request.html#using-variable-data-formats")
				else if (e instanceof Error && e.constructor !== Error) throw e
				else deferred.reject(e)
			}
			if (xhrOptions.background !== true) m.endComputation()
		}
		ajax(xhrOptions)
		return deferred.promise
	}

	//testing API
	m.deps = function(mock) {return window = mock}
	//for internal testing only, do not use `m.deps.factory`
	m.deps.factory = app

	return m
}(typeof window != "undefined" ? window : {})

if (typeof module != "undefined" && module !== null) module.exports = m
if (typeof define == "function" && define.amd) define(function() {return m})

;;;

},{}],2:[function(require,module,exports){
m = require('mithril');

//this application only has one module: todo
var todo = {};

//for simplicity, we use this module to namespace the model classes

//the Todo class has two properties
todo.Todo = function(data) {
    this.description = m.prop(data.description);
    this.done = m.prop(false);
};

//the TodoList class is a list of Todo's
todo.TodoList = Array;

//the controller uses three model-level entities, of which one is a custom defined class:
//`Todo` is the central class in this application
//`list` is merely a generic array, with standard array methods
//`description` is a temporary storage box that holds a string
//
//the `add` method simply adds a new todo to the list
todo.controller = function() {
    this.list = new todo.TodoList();
    this.description = m.prop("");

    this.add = function() {
        if (this.description()) {
            this.list.push(new todo.Todo({description: this.description()}));
            this.description("");
        }
    }.bind(this);
};

//here's the view
todo.view = function(ctrl) {
    return m("html", [
        m("body", [
            m("input", {onchange: m.withAttr("value", ctrl.description), value: ctrl.description()}),
            m("button", {onclick: ctrl.add}, "Add"),
            m("table", [
                ctrl.list.map(function(task, index) {
                    return m("tr", [
                        m("td", [
                            m("input[type=checkbox]", {onclick: m.withAttr("checked", task.done), checked: task.done()})
                        ]),
                        m("td", {style: {textDecoration: task.done() ? "line-through" : "none"}}, task.description()),
                    ])
                })
            ])
        ])
    ]);
};

//initialize the application
m.module(document, todo);

},{"mithril":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2pvc2gvc2FuZGJveC9taXRocmlsL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9qb3NoL3NhbmRib3gvbWl0aHJpbC9ub2RlX21vZHVsZXMvbWl0aHJpbC9taXRocmlsLmpzIiwiL2hvbWUvam9zaC9zYW5kYm94L21pdGhyaWwvc3JjL3NjcmlwdHMvYXBwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIk1pdGhyaWwgPSBtID0gbmV3IGZ1bmN0aW9uIGFwcCh3aW5kb3cpIHtcclxuXHR2YXIgdHlwZSA9IHt9LnRvU3RyaW5nXHJcblx0dmFyIHBhcnNlciA9IC8oPzooXnwjfFxcLikoW14jXFwuXFxbXFxdXSspKXwoXFxbLis/XFxdKS9nLCBhdHRyUGFyc2VyID0gL1xcWyguKz8pKD86PShcInwnfCkoLio/KVxcMik/XFxdL1xyXG5cdFxyXG5cdGZ1bmN0aW9uIG0oKSB7XHJcblx0XHR2YXIgYXJncyA9IGFyZ3VtZW50c1xyXG5cdFx0dmFyIGhhc0F0dHJzID0gdHlwZS5jYWxsKGFyZ3NbMV0pID09IFwiW29iamVjdCBPYmplY3RdXCIgJiYgIShcInRhZ1wiIGluIGFyZ3NbMV0pICYmICEoXCJzdWJ0cmVlXCIgaW4gYXJnc1sxXSlcclxuXHRcdHZhciBhdHRycyA9IGhhc0F0dHJzID8gYXJnc1sxXSA6IHt9XHJcblx0XHR2YXIgY2xhc3NBdHRyTmFtZSA9IFwiY2xhc3NcIiBpbiBhdHRycyA/IFwiY2xhc3NcIiA6IFwiY2xhc3NOYW1lXCJcclxuXHRcdHZhciBjZWxsID0ge3RhZzogXCJkaXZcIiwgYXR0cnM6IHt9fVxyXG5cdFx0dmFyIG1hdGNoLCBjbGFzc2VzID0gW11cclxuXHRcdHdoaWxlIChtYXRjaCA9IHBhcnNlci5leGVjKGFyZ3NbMF0pKSB7XHJcblx0XHRcdGlmIChtYXRjaFsxXSA9PSBcIlwiKSBjZWxsLnRhZyA9IG1hdGNoWzJdXHJcblx0XHRcdGVsc2UgaWYgKG1hdGNoWzFdID09IFwiI1wiKSBjZWxsLmF0dHJzLmlkID0gbWF0Y2hbMl1cclxuXHRcdFx0ZWxzZSBpZiAobWF0Y2hbMV0gPT0gXCIuXCIpIGNsYXNzZXMucHVzaChtYXRjaFsyXSlcclxuXHRcdFx0ZWxzZSBpZiAobWF0Y2hbM11bMF0gPT0gXCJbXCIpIHtcclxuXHRcdFx0XHR2YXIgcGFpciA9IGF0dHJQYXJzZXIuZXhlYyhtYXRjaFszXSlcclxuXHRcdFx0XHRjZWxsLmF0dHJzW3BhaXJbMV1dID0gcGFpclszXSB8fCAocGFpclsyXSA/IFwiXCIgOnRydWUpXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGlmIChjbGFzc2VzLmxlbmd0aCA+IDApIGNlbGwuYXR0cnNbY2xhc3NBdHRyTmFtZV0gPSBjbGFzc2VzLmpvaW4oXCIgXCIpXHJcblx0XHRcclxuXHRcdGNlbGwuY2hpbGRyZW4gPSBoYXNBdHRycyA/IGFyZ3NbMl0gOiBhcmdzWzFdXHJcblx0XHRcclxuXHRcdGZvciAodmFyIGF0dHJOYW1lIGluIGF0dHJzKSB7XHJcblx0XHRcdGlmIChhdHRyTmFtZSA9PSBjbGFzc0F0dHJOYW1lKSBjZWxsLmF0dHJzW2F0dHJOYW1lXSA9IChjZWxsLmF0dHJzW2F0dHJOYW1lXSB8fCBcIlwiKSArIFwiIFwiICsgYXR0cnNbYXR0ck5hbWVdXHJcblx0XHRcdGVsc2UgY2VsbC5hdHRyc1thdHRyTmFtZV0gPSBhdHRyc1thdHRyTmFtZV1cclxuXHRcdH1cclxuXHRcdHJldHVybiBjZWxsXHJcblx0fVxyXG5cdGZ1bmN0aW9uIGJ1aWxkKHBhcmVudEVsZW1lbnQsIHBhcmVudFRhZywgcGFyZW50Q2FjaGUsIHBhcmVudEluZGV4LCBkYXRhLCBjYWNoZWQsIHNob3VsZFJlYXR0YWNoLCBpbmRleCwgZWRpdGFibGUsIG5hbWVzcGFjZSwgY29uZmlncykge1xyXG5cdFx0aWYgKGRhdGEgPT09IG51bGwgfHwgZGF0YSA9PT0gdW5kZWZpbmVkKSBkYXRhID0gXCJcIlxyXG5cdFx0aWYgKGRhdGEuc3VidHJlZSA9PT0gXCJyZXRhaW5cIikgcmV0dXJuIGNhY2hlZFxyXG5cclxuXHRcdHZhciBjYWNoZWRUeXBlID0gdHlwZS5jYWxsKGNhY2hlZCksIGRhdGFUeXBlID0gdHlwZS5jYWxsKGRhdGEpXHJcblx0XHRpZiAoY2FjaGVkVHlwZSAhPSBkYXRhVHlwZSkge1xyXG5cdFx0XHRpZiAoY2FjaGVkICE9PSBudWxsICYmIGNhY2hlZCAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0aWYgKHBhcmVudENhY2hlICYmIHBhcmVudENhY2hlLm5vZGVzKSB7XHJcblx0XHRcdFx0XHR2YXIgb2Zmc2V0ID0gaW5kZXggLSBwYXJlbnRJbmRleFxyXG5cdFx0XHRcdFx0dmFyIGVuZCA9IG9mZnNldCArIChkYXRhVHlwZSA9PSBcIltvYmplY3QgQXJyYXldXCIgPyBkYXRhIDogY2FjaGVkLm5vZGVzKS5sZW5ndGhcclxuXHRcdFx0XHRcdGNsZWFyKHBhcmVudENhY2hlLm5vZGVzLnNsaWNlKG9mZnNldCwgZW5kKSwgcGFyZW50Q2FjaGUuc2xpY2Uob2Zmc2V0LCBlbmQpKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIGNsZWFyKGNhY2hlZC5ub2RlcywgY2FjaGVkKVxyXG5cdFx0XHR9XHJcblx0XHRcdGNhY2hlZCA9IG5ldyBkYXRhLmNvbnN0cnVjdG9yXHJcblx0XHRcdGNhY2hlZC5ub2RlcyA9IFtdXHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGRhdGFUeXBlID09IFwiW29iamVjdCBBcnJheV1cIikge1xyXG5cdFx0XHRkYXRhID0gZmxhdHRlbihkYXRhKVxyXG5cdFx0XHR2YXIgbm9kZXMgPSBbXSwgaW50YWN0ID0gY2FjaGVkLmxlbmd0aCA9PT0gZGF0YS5sZW5ndGgsIHN1YkFycmF5Q291bnQgPSAwXHJcblx0XHRcdFxyXG5cdFx0XHR2YXIgREVMRVRJT04gPSAxLCBJTlNFUlRJT04gPSAyICwgTU9WRSA9IDNcclxuXHRcdFx0dmFyIGV4aXN0aW5nID0ge30sIHVua2V5ZWQgPSBbXSwgc2hvdWxkTWFpbnRhaW5JZGVudGl0aWVzID0gZmFsc2VcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjYWNoZWQubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRpZiAoY2FjaGVkW2ldICYmIGNhY2hlZFtpXS5hdHRycyAmJiBjYWNoZWRbaV0uYXR0cnMua2V5ICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHRcdHNob3VsZE1haW50YWluSWRlbnRpdGllcyA9IHRydWVcclxuXHRcdFx0XHRcdGV4aXN0aW5nW2NhY2hlZFtpXS5hdHRycy5rZXldID0ge2FjdGlvbjogREVMRVRJT04sIGluZGV4OiBpfVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoc2hvdWxkTWFpbnRhaW5JZGVudGl0aWVzKSB7XHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHRpZiAoZGF0YVtpXSAmJiBkYXRhW2ldLmF0dHJzKSB7XHJcblx0XHRcdFx0XHRcdGlmIChkYXRhW2ldLmF0dHJzLmtleSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0XHRcdFx0dmFyIGtleSA9IGRhdGFbaV0uYXR0cnMua2V5XHJcblx0XHRcdFx0XHRcdFx0aWYgKCFleGlzdGluZ1trZXldKSBleGlzdGluZ1trZXldID0ge2FjdGlvbjogSU5TRVJUSU9OLCBpbmRleDogaX1cclxuXHRcdFx0XHRcdFx0XHRlbHNlIGV4aXN0aW5nW2tleV0gPSB7YWN0aW9uOiBNT1ZFLCBpbmRleDogaSwgZnJvbTogZXhpc3Rpbmdba2V5XS5pbmRleCwgZWxlbWVudDogcGFyZW50RWxlbWVudC5jaGlsZE5vZGVzW2V4aXN0aW5nW2tleV0uaW5kZXhdfVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGVsc2UgdW5rZXllZC5wdXNoKHtpbmRleDogaSwgZWxlbWVudDogcGFyZW50RWxlbWVudC5jaGlsZE5vZGVzW2ldfSlcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0dmFyIGFjdGlvbnMgPSBPYmplY3Qua2V5cyhleGlzdGluZykubWFwKGZ1bmN0aW9uKGtleSkge3JldHVybiBleGlzdGluZ1trZXldfSlcclxuXHRcdFx0XHR2YXIgY2hhbmdlcyA9IGFjdGlvbnMuc29ydChmdW5jdGlvbihhLCBiKSB7cmV0dXJuIGEuYWN0aW9uIC0gYi5hY3Rpb24gfHwgYS5pbmRleCAtIGIuaW5kZXh9KVxyXG5cdFx0XHRcdHZhciBuZXdDYWNoZWQgPSBjYWNoZWQuc2xpY2UoKVxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwLCBjaGFuZ2U7IGNoYW5nZSA9IGNoYW5nZXNbaV07IGkrKykge1xyXG5cdFx0XHRcdFx0aWYgKGNoYW5nZS5hY3Rpb24gPT0gREVMRVRJT04pIHtcclxuXHRcdFx0XHRcdFx0Y2xlYXIoY2FjaGVkW2NoYW5nZS5pbmRleF0ubm9kZXMsIGNhY2hlZFtjaGFuZ2UuaW5kZXhdKVxyXG5cdFx0XHRcdFx0XHRuZXdDYWNoZWQuc3BsaWNlKGNoYW5nZS5pbmRleCwgMSlcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmIChjaGFuZ2UuYWN0aW9uID09IElOU0VSVElPTikge1xyXG5cdFx0XHRcdFx0XHR2YXIgZHVtbXkgPSB3aW5kb3cuZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxyXG5cdFx0XHRcdFx0XHRkdW1teS5rZXkgPSBkYXRhW2NoYW5nZS5pbmRleF0uYXR0cnMua2V5XHJcblx0XHRcdFx0XHRcdHBhcmVudEVsZW1lbnQuaW5zZXJ0QmVmb3JlKGR1bW15LCBwYXJlbnRFbGVtZW50LmNoaWxkTm9kZXNbY2hhbmdlLmluZGV4XSlcclxuXHRcdFx0XHRcdFx0bmV3Q2FjaGVkLnNwbGljZShjaGFuZ2UuaW5kZXgsIDAsIHthdHRyczoge2tleTogZGF0YVtjaGFuZ2UuaW5kZXhdLmF0dHJzLmtleX0sIG5vZGVzOiBbZHVtbXldfSlcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0aWYgKGNoYW5nZS5hY3Rpb24gPT0gTU9WRSkge1xyXG5cdFx0XHRcdFx0XHRpZiAocGFyZW50RWxlbWVudC5jaGlsZE5vZGVzW2NoYW5nZS5pbmRleF0gIT09IGNoYW5nZS5lbGVtZW50KSB7XHJcblx0XHRcdFx0XHRcdFx0cGFyZW50RWxlbWVudC5pbnNlcnRCZWZvcmUoY2hhbmdlLmVsZW1lbnQsIHBhcmVudEVsZW1lbnQuY2hpbGROb2Rlc1tjaGFuZ2UuaW5kZXhdKVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdG5ld0NhY2hlZFtjaGFuZ2UuaW5kZXhdID0gY2FjaGVkW2NoYW5nZS5mcm9tXVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHVua2V5ZWQubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdHZhciBjaGFuZ2UgPSB1bmtleWVkW2ldXHJcblx0XHRcdFx0XHRwYXJlbnRFbGVtZW50Lmluc2VydEJlZm9yZShjaGFuZ2UuZWxlbWVudCwgcGFyZW50RWxlbWVudC5jaGlsZE5vZGVzW2NoYW5nZS5pbmRleF0pXHJcblx0XHRcdFx0XHRuZXdDYWNoZWRbY2hhbmdlLmluZGV4XSA9IGNhY2hlZFtjaGFuZ2UuaW5kZXhdXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGNhY2hlZCA9IG5ld0NhY2hlZFxyXG5cdFx0XHRcdGNhY2hlZC5ub2RlcyA9IFtdXHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDAsIGNoaWxkOyBjaGlsZCA9IHBhcmVudEVsZW1lbnQuY2hpbGROb2Rlc1tpXTsgaSsrKSBjYWNoZWQubm9kZXMucHVzaChjaGlsZClcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIGNhY2hlQ291bnQgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHZhciBpdGVtID0gYnVpbGQocGFyZW50RWxlbWVudCwgcGFyZW50VGFnLCBjYWNoZWQsIGluZGV4LCBkYXRhW2ldLCBjYWNoZWRbY2FjaGVDb3VudF0sIHNob3VsZFJlYXR0YWNoLCBpbmRleCArIHN1YkFycmF5Q291bnQgfHwgc3ViQXJyYXlDb3VudCwgZWRpdGFibGUsIG5hbWVzcGFjZSwgY29uZmlncylcclxuXHRcdFx0XHRpZiAoaXRlbSA9PT0gdW5kZWZpbmVkKSBjb250aW51ZVxyXG5cdFx0XHRcdGlmICghaXRlbS5ub2Rlcy5pbnRhY3QpIGludGFjdCA9IGZhbHNlXHJcblx0XHRcdFx0dmFyIGlzQXJyYXkgPSBpdGVtIGluc3RhbmNlb2YgQXJyYXlcclxuXHRcdFx0XHRzdWJBcnJheUNvdW50ICs9IGlzQXJyYXkgPyBpdGVtLmxlbmd0aCA6IDFcclxuXHRcdFx0XHRjYWNoZWRbY2FjaGVDb3VudCsrXSA9IGl0ZW1cclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoIWludGFjdCkge1xyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0aWYgKGNhY2hlZFtpXSAhPT0gdW5kZWZpbmVkKSBub2RlcyA9IG5vZGVzLmNvbmNhdChjYWNoZWRbaV0ubm9kZXMpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwLCBub2RlOyBub2RlID0gY2FjaGVkLm5vZGVzW2ldOyBpKyspIHtcclxuXHRcdFx0XHRcdGlmIChub2RlLnBhcmVudE5vZGUgIT09IG51bGwgJiYgbm9kZXMuaW5kZXhPZihub2RlKSA8IDApIG5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRmb3IgKHZhciBpID0gY2FjaGVkLm5vZGVzLmxlbmd0aCwgbm9kZTsgbm9kZSA9IG5vZGVzW2ldOyBpKyspIHtcclxuXHRcdFx0XHRcdGlmIChub2RlLnBhcmVudE5vZGUgPT09IG51bGwpIHBhcmVudEVsZW1lbnQuYXBwZW5kQ2hpbGQobm9kZSlcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKGRhdGEubGVuZ3RoIDwgY2FjaGVkLmxlbmd0aCkgY2FjaGVkLmxlbmd0aCA9IGRhdGEubGVuZ3RoXHJcblx0XHRcdFx0Y2FjaGVkLm5vZGVzID0gbm9kZXNcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYgKGRhdGFUeXBlID09IFwiW29iamVjdCBPYmplY3RdXCIpIHtcclxuXHRcdFx0aWYgKGRhdGEudGFnICE9IGNhY2hlZC50YWcgfHwgT2JqZWN0LmtleXMoZGF0YS5hdHRycykuam9pbigpICE9IE9iamVjdC5rZXlzKGNhY2hlZC5hdHRycykuam9pbigpIHx8IGRhdGEuYXR0cnMuaWQgIT0gY2FjaGVkLmF0dHJzLmlkKSB7XHJcblx0XHRcdFx0Y2xlYXIoY2FjaGVkLm5vZGVzKVxyXG5cdFx0XHRcdGlmIChjYWNoZWQuY29uZmlnQ29udGV4dCAmJiB0eXBlb2YgY2FjaGVkLmNvbmZpZ0NvbnRleHQub251bmxvYWQgPT0gXCJmdW5jdGlvblwiKSBjYWNoZWQuY29uZmlnQ29udGV4dC5vbnVubG9hZCgpXHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHR5cGVvZiBkYXRhLnRhZyAhPSBcInN0cmluZ1wiKSByZXR1cm5cclxuXHJcblx0XHRcdHZhciBub2RlLCBpc05ldyA9IGNhY2hlZC5ub2Rlcy5sZW5ndGggPT09IDBcclxuXHRcdFx0aWYgKGRhdGEuYXR0cnMueG1sbnMpIG5hbWVzcGFjZSA9IGRhdGEuYXR0cnMueG1sbnNcclxuXHRcdFx0ZWxzZSBpZiAoZGF0YS50YWcgPT09IFwic3ZnXCIpIG5hbWVzcGFjZSA9IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIlxyXG5cdFx0XHRpZiAoaXNOZXcpIHtcclxuXHRcdFx0XHRub2RlID0gbmFtZXNwYWNlID09PSB1bmRlZmluZWQgPyB3aW5kb3cuZG9jdW1lbnQuY3JlYXRlRWxlbWVudChkYXRhLnRhZykgOiB3aW5kb3cuZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5hbWVzcGFjZSwgZGF0YS50YWcpXHJcblx0XHRcdFx0Y2FjaGVkID0ge1xyXG5cdFx0XHRcdFx0dGFnOiBkYXRhLnRhZyxcclxuXHRcdFx0XHRcdC8vcHJvY2VzcyBjaGlsZHJlbiBiZWZvcmUgYXR0cnMgc28gdGhhdCBzZWxlY3QudmFsdWUgd29ya3MgY29ycmVjdGx5XHJcblx0XHRcdFx0XHRjaGlsZHJlbjogZGF0YS5jaGlsZHJlbiAhPT0gdW5kZWZpbmVkID8gYnVpbGQobm9kZSwgZGF0YS50YWcsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBkYXRhLmNoaWxkcmVuLCBjYWNoZWQuY2hpbGRyZW4sIHRydWUsIDAsIGRhdGEuYXR0cnMuY29udGVudGVkaXRhYmxlID8gbm9kZSA6IGVkaXRhYmxlLCBuYW1lc3BhY2UsIGNvbmZpZ3MpIDogdW5kZWZpbmVkLFxyXG5cdFx0XHRcdFx0YXR0cnM6IHNldEF0dHJpYnV0ZXMobm9kZSwgZGF0YS50YWcsIGRhdGEuYXR0cnMsIHt9LCBuYW1lc3BhY2UpLFxyXG5cdFx0XHRcdFx0bm9kZXM6IFtub2RlXVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRwYXJlbnRFbGVtZW50Lmluc2VydEJlZm9yZShub2RlLCBwYXJlbnRFbGVtZW50LmNoaWxkTm9kZXNbaW5kZXhdIHx8IG51bGwpXHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0bm9kZSA9IGNhY2hlZC5ub2Rlc1swXVxyXG5cdFx0XHRcdHNldEF0dHJpYnV0ZXMobm9kZSwgZGF0YS50YWcsIGRhdGEuYXR0cnMsIGNhY2hlZC5hdHRycywgbmFtZXNwYWNlKVxyXG5cdFx0XHRcdGNhY2hlZC5jaGlsZHJlbiA9IGJ1aWxkKG5vZGUsIGRhdGEudGFnLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgZGF0YS5jaGlsZHJlbiwgY2FjaGVkLmNoaWxkcmVuLCBmYWxzZSwgMCwgZGF0YS5hdHRycy5jb250ZW50ZWRpdGFibGUgPyBub2RlIDogZWRpdGFibGUsIG5hbWVzcGFjZSwgY29uZmlncylcclxuXHRcdFx0XHRjYWNoZWQubm9kZXMuaW50YWN0ID0gdHJ1ZVxyXG5cdFx0XHRcdGlmIChzaG91bGRSZWF0dGFjaCA9PT0gdHJ1ZSkgcGFyZW50RWxlbWVudC5pbnNlcnRCZWZvcmUobm9kZSwgcGFyZW50RWxlbWVudC5jaGlsZE5vZGVzW2luZGV4XSB8fCBudWxsKVxyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh0eXBlLmNhbGwoZGF0YS5hdHRyc1tcImNvbmZpZ1wiXSkgPT0gXCJbb2JqZWN0IEZ1bmN0aW9uXVwiKSB7XHJcblx0XHRcdFx0Y29uZmlncy5wdXNoKGRhdGEuYXR0cnNbXCJjb25maWdcIl0uYmluZCh3aW5kb3csIG5vZGUsICFpc05ldywgY2FjaGVkLmNvbmZpZ0NvbnRleHQgPSBjYWNoZWQuY29uZmlnQ29udGV4dCB8fCB7fSwgY2FjaGVkKSlcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHZhciBub2Rlc1xyXG5cdFx0XHRpZiAoY2FjaGVkLm5vZGVzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRcdGlmIChkYXRhLiR0cnVzdGVkKSB7XHJcblx0XHRcdFx0XHRub2RlcyA9IGluamVjdEhUTUwocGFyZW50RWxlbWVudCwgaW5kZXgsIGRhdGEpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0bm9kZXMgPSBbd2luZG93LmRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGRhdGEpXVxyXG5cdFx0XHRcdFx0cGFyZW50RWxlbWVudC5pbnNlcnRCZWZvcmUobm9kZXNbMF0sIHBhcmVudEVsZW1lbnQuY2hpbGROb2Rlc1tpbmRleF0gfHwgbnVsbClcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Y2FjaGVkID0gXCJzdHJpbmcgbnVtYmVyIGJvb2xlYW5cIi5pbmRleE9mKHR5cGVvZiBkYXRhKSA+IC0xID8gbmV3IGRhdGEuY29uc3RydWN0b3IoZGF0YSkgOiBkYXRhXHJcblx0XHRcdFx0Y2FjaGVkLm5vZGVzID0gbm9kZXNcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIGlmIChjYWNoZWQudmFsdWVPZigpICE9PSBkYXRhLnZhbHVlT2YoKSB8fCBzaG91bGRSZWF0dGFjaCA9PT0gdHJ1ZSkge1xyXG5cdFx0XHRcdG5vZGVzID0gY2FjaGVkLm5vZGVzXHJcblx0XHRcdFx0aWYgKCFlZGl0YWJsZSB8fCBlZGl0YWJsZSAhPT0gd2luZG93LmRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpIHtcclxuXHRcdFx0XHRcdGlmIChkYXRhLiR0cnVzdGVkKSB7XHJcblx0XHRcdFx0XHRcdGNsZWFyKG5vZGVzLCBjYWNoZWQpXHJcblx0XHRcdFx0XHRcdG5vZGVzID0gaW5qZWN0SFRNTChwYXJlbnRFbGVtZW50LCBpbmRleCwgZGF0YSlcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRpZiAocGFyZW50VGFnID09PSBcInRleHRhcmVhXCIpIHBhcmVudEVsZW1lbnQudmFsdWUgPSBkYXRhXHJcblx0XHRcdFx0XHRcdGVsc2UgaWYgKGVkaXRhYmxlKSBlZGl0YWJsZS5pbm5lckhUTUwgPSBkYXRhXHJcblx0XHRcdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdGlmIChub2Rlc1swXS5ub2RlVHlwZSA9PSAxIHx8IG5vZGVzLmxlbmd0aCA+IDEpIHsgLy93YXMgYSB0cnVzdGVkIHN0cmluZ1xyXG5cdFx0XHRcdFx0XHRcdFx0Y2xlYXIoY2FjaGVkLm5vZGVzLCBjYWNoZWQpXHJcblx0XHRcdFx0XHRcdFx0XHRub2RlcyA9IFt3aW5kb3cuZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZGF0YSldXHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdHBhcmVudEVsZW1lbnQuaW5zZXJ0QmVmb3JlKG5vZGVzWzBdLCBwYXJlbnRFbGVtZW50LmNoaWxkTm9kZXNbaW5kZXhdIHx8IG51bGwpXHJcblx0XHRcdFx0XHRcdFx0bm9kZXNbMF0ubm9kZVZhbHVlID0gZGF0YVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGNhY2hlZCA9IG5ldyBkYXRhLmNvbnN0cnVjdG9yKGRhdGEpXHJcblx0XHRcdFx0Y2FjaGVkLm5vZGVzID0gbm9kZXNcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIGNhY2hlZC5ub2Rlcy5pbnRhY3QgPSB0cnVlXHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGNhY2hlZFxyXG5cdH1cclxuXHRmdW5jdGlvbiBzZXRBdHRyaWJ1dGVzKG5vZGUsIHRhZywgZGF0YUF0dHJzLCBjYWNoZWRBdHRycywgbmFtZXNwYWNlKSB7XHJcblx0XHR2YXIgZ3JvdXBzID0ge31cclxuXHRcdGZvciAodmFyIGF0dHJOYW1lIGluIGRhdGFBdHRycykge1xyXG5cdFx0XHR2YXIgZGF0YUF0dHIgPSBkYXRhQXR0cnNbYXR0ck5hbWVdXHJcblx0XHRcdHZhciBjYWNoZWRBdHRyID0gY2FjaGVkQXR0cnNbYXR0ck5hbWVdXHJcblx0XHRcdGlmICghKGF0dHJOYW1lIGluIGNhY2hlZEF0dHJzKSB8fCAoY2FjaGVkQXR0ciAhPT0gZGF0YUF0dHIpIHx8IG5vZGUgPT09IHdpbmRvdy5kb2N1bWVudC5hY3RpdmVFbGVtZW50KSB7XHJcblx0XHRcdFx0Y2FjaGVkQXR0cnNbYXR0ck5hbWVdID0gZGF0YUF0dHJcclxuXHRcdFx0XHRpZiAoYXR0ck5hbWUgPT09IFwiY29uZmlnXCIpIGNvbnRpbnVlXHJcblx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIGRhdGFBdHRyID09IFwiZnVuY3Rpb25cIiAmJiBhdHRyTmFtZS5pbmRleE9mKFwib25cIikgPT0gMCkge1xyXG5cdFx0XHRcdFx0bm9kZVthdHRyTmFtZV0gPSBhdXRvcmVkcmF3KGRhdGFBdHRyLCBub2RlKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIGlmIChhdHRyTmFtZSA9PT0gXCJzdHlsZVwiICYmIHR5cGVvZiBkYXRhQXR0ciA9PSBcIm9iamVjdFwiKSB7XHJcblx0XHRcdFx0XHRmb3IgKHZhciBydWxlIGluIGRhdGFBdHRyKSB7XHJcblx0XHRcdFx0XHRcdGlmIChjYWNoZWRBdHRyID09PSB1bmRlZmluZWQgfHwgY2FjaGVkQXR0cltydWxlXSAhPT0gZGF0YUF0dHJbcnVsZV0pIG5vZGUuc3R5bGVbcnVsZV0gPSBkYXRhQXR0cltydWxlXVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Zm9yICh2YXIgcnVsZSBpbiBjYWNoZWRBdHRyKSB7XHJcblx0XHRcdFx0XHRcdGlmICghKHJ1bGUgaW4gZGF0YUF0dHIpKSBub2RlLnN0eWxlW3J1bGVdID0gXCJcIlxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRlbHNlIGlmIChuYW1lc3BhY2UgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdFx0aWYgKGF0dHJOYW1lID09PSBcImhyZWZcIikgbm9kZS5zZXRBdHRyaWJ1dGVOUyhcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIiwgXCJocmVmXCIsIGRhdGFBdHRyKVxyXG5cdFx0XHRcdFx0ZWxzZSBpZiAoYXR0ck5hbWUgPT09IFwiY2xhc3NOYW1lXCIpIG5vZGUuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgZGF0YUF0dHIpXHJcblx0XHRcdFx0XHRlbHNlIG5vZGUuc2V0QXR0cmlidXRlKGF0dHJOYW1lLCBkYXRhQXR0cilcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSBpZiAoYXR0ck5hbWUgPT09IFwidmFsdWVcIiAmJiB0YWcgPT09IFwiaW5wdXRcIikge1xyXG5cdFx0XHRcdFx0aWYgKG5vZGUudmFsdWUgIT09IGRhdGFBdHRyKSBub2RlLnZhbHVlID0gZGF0YUF0dHJcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSBpZiAoYXR0ck5hbWUgaW4gbm9kZSAmJiAhKGF0dHJOYW1lID09IFwibGlzdFwiIHx8IGF0dHJOYW1lID09IFwic3R5bGVcIikpIHtcclxuXHRcdFx0XHRcdG5vZGVbYXR0ck5hbWVdID0gZGF0YUF0dHJcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxzZSBub2RlLnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgZGF0YUF0dHIpXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBjYWNoZWRBdHRyc1xyXG5cdH1cclxuXHRmdW5jdGlvbiBjbGVhcihub2RlcywgY2FjaGVkKSB7XHJcblx0XHRmb3IgKHZhciBpID0gbm9kZXMubGVuZ3RoIC0gMTsgaSA+IC0xOyBpLS0pIHtcclxuXHRcdFx0aWYgKG5vZGVzW2ldICYmIG5vZGVzW2ldLnBhcmVudE5vZGUpIHtcclxuXHRcdFx0XHRub2Rlc1tpXS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGVzW2ldKVxyXG5cdFx0XHRcdGNhY2hlZCA9IFtdLmNvbmNhdChjYWNoZWQpXHJcblx0XHRcdFx0aWYgKGNhY2hlZFtpXSkgdW5sb2FkKGNhY2hlZFtpXSlcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0aWYgKG5vZGVzLmxlbmd0aCAhPSAwKSBub2Rlcy5sZW5ndGggPSAwXHJcblx0fVxyXG5cdGZ1bmN0aW9uIHVubG9hZChjYWNoZWQpIHtcclxuXHRcdGlmIChjYWNoZWQuY29uZmlnQ29udGV4dCAmJiB0eXBlb2YgY2FjaGVkLmNvbmZpZ0NvbnRleHQub251bmxvYWQgPT0gXCJmdW5jdGlvblwiKSBjYWNoZWQuY29uZmlnQ29udGV4dC5vbnVubG9hZCgpXHJcblx0XHRpZiAoY2FjaGVkLmNoaWxkcmVuKSB7XHJcblx0XHRcdGlmIChjYWNoZWQuY2hpbGRyZW4gaW5zdGFuY2VvZiBBcnJheSkgZm9yICh2YXIgaSA9IDA7IGkgPCBjYWNoZWQuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHVubG9hZChjYWNoZWQuY2hpbGRyZW5baV0pXHJcblx0XHRcdGVsc2UgaWYgKGNhY2hlZC5jaGlsZHJlbi50YWcpIHVubG9hZChjYWNoZWQuY2hpbGRyZW4pXHJcblx0XHR9XHJcblx0fVxyXG5cdGZ1bmN0aW9uIGluamVjdEhUTUwocGFyZW50RWxlbWVudCwgaW5kZXgsIGRhdGEpIHtcclxuXHRcdHZhciBuZXh0U2libGluZyA9IHBhcmVudEVsZW1lbnQuY2hpbGROb2Rlc1tpbmRleF1cclxuXHRcdGlmIChuZXh0U2libGluZykge1xyXG5cdFx0XHR2YXIgaXNFbGVtZW50ID0gbmV4dFNpYmxpbmcubm9kZVR5cGUgIT0gMVxyXG5cdFx0XHR2YXIgcGxhY2Vob2xkZXIgPSB3aW5kb3cuZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIilcclxuXHRcdFx0aWYgKGlzRWxlbWVudCkge1xyXG5cdFx0XHRcdHBhcmVudEVsZW1lbnQuaW5zZXJ0QmVmb3JlKHBsYWNlaG9sZGVyLCBuZXh0U2libGluZylcclxuXHRcdFx0XHRwbGFjZWhvbGRlci5pbnNlcnRBZGphY2VudEhUTUwoXCJiZWZvcmViZWdpblwiLCBkYXRhKVxyXG5cdFx0XHRcdHBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQocGxhY2Vob2xkZXIpXHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBuZXh0U2libGluZy5pbnNlcnRBZGphY2VudEhUTUwoXCJiZWZvcmViZWdpblwiLCBkYXRhKVxyXG5cdFx0fVxyXG5cdFx0ZWxzZSBwYXJlbnRFbGVtZW50Lmluc2VydEFkamFjZW50SFRNTChcImJlZm9yZWVuZFwiLCBkYXRhKVxyXG5cdFx0dmFyIG5vZGVzID0gW11cclxuXHRcdHdoaWxlIChwYXJlbnRFbGVtZW50LmNoaWxkTm9kZXNbaW5kZXhdICE9PSBuZXh0U2libGluZykge1xyXG5cdFx0XHRub2Rlcy5wdXNoKHBhcmVudEVsZW1lbnQuY2hpbGROb2Rlc1tpbmRleF0pXHJcblx0XHRcdGluZGV4KytcclxuXHRcdH1cclxuXHRcdHJldHVybiBub2Rlc1xyXG5cdH1cclxuXHRmdW5jdGlvbiBmbGF0dGVuKGRhdGEpIHtcclxuXHRcdHZhciBmbGF0dGVuZWQgPSBbXVxyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHZhciBpdGVtID0gZGF0YVtpXVxyXG5cdFx0XHRpZiAoaXRlbSBpbnN0YW5jZW9mIEFycmF5KSBmbGF0dGVuZWQucHVzaC5hcHBseShmbGF0dGVuZWQsIGZsYXR0ZW4oaXRlbSkpXHJcblx0XHRcdGVsc2UgZmxhdHRlbmVkLnB1c2goaXRlbSlcclxuXHRcdH1cclxuXHRcdHJldHVybiBmbGF0dGVuZWRcclxuXHR9XHJcblx0ZnVuY3Rpb24gYXV0b3JlZHJhdyhjYWxsYmFjaywgb2JqZWN0LCBncm91cCkge1xyXG5cdFx0cmV0dXJuIGZ1bmN0aW9uKGUpIHtcclxuXHRcdFx0ZSA9IGUgfHwgZXZlbnRcclxuXHRcdFx0bS5zdGFydENvbXB1dGF0aW9uKClcclxuXHRcdFx0dHJ5IHtyZXR1cm4gY2FsbGJhY2suY2FsbChvYmplY3QsIGUpfVxyXG5cdFx0XHRmaW5hbGx5IHtcclxuXHRcdFx0XHRpZiAoIWxhc3RSZWRyYXdJZCkgbGFzdFJlZHJhd0lkID0gLTE7XHJcblx0XHRcdFx0bS5lbmRDb21wdXRhdGlvbigpXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHZhciBodG1sXHJcblx0dmFyIGRvY3VtZW50Tm9kZSA9IHtcclxuXHRcdGluc2VydEFkamFjZW50SFRNTDogZnVuY3Rpb24oXywgZGF0YSkge1xyXG5cdFx0XHR3aW5kb3cuZG9jdW1lbnQud3JpdGUoZGF0YSlcclxuXHRcdFx0d2luZG93LmRvY3VtZW50LmNsb3NlKClcclxuXHRcdH0sXHJcblx0XHRhcHBlbmRDaGlsZDogZnVuY3Rpb24obm9kZSkge1xyXG5cdFx0XHRpZiAoaHRtbCA9PT0gdW5kZWZpbmVkKSBodG1sID0gd2luZG93LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJodG1sXCIpXHJcblx0XHRcdGlmIChub2RlLm5vZGVOYW1lID09IFwiSFRNTFwiKSBodG1sID0gbm9kZVxyXG5cdFx0XHRlbHNlIGh0bWwuYXBwZW5kQ2hpbGQobm9kZSlcclxuXHRcdFx0aWYgKHdpbmRvdy5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgJiYgd2luZG93LmRvY3VtZW50LmRvY3VtZW50RWxlbWVudCAhPT0gaHRtbCkge1xyXG5cdFx0XHRcdHdpbmRvdy5kb2N1bWVudC5yZXBsYWNlQ2hpbGQoaHRtbCwgd2luZG93LmRvY3VtZW50LmRvY3VtZW50RWxlbWVudClcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHdpbmRvdy5kb2N1bWVudC5hcHBlbmRDaGlsZChodG1sKVxyXG5cdFx0fSxcclxuXHRcdGluc2VydEJlZm9yZTogZnVuY3Rpb24obm9kZSkge1xyXG5cdFx0XHR0aGlzLmFwcGVuZENoaWxkKG5vZGUpXHJcblx0XHR9LFxyXG5cdFx0Y2hpbGROb2RlczogW11cclxuXHR9XHJcblx0dmFyIG5vZGVDYWNoZSA9IFtdLCBjZWxsQ2FjaGUgPSB7fVxyXG5cdG0ucmVuZGVyID0gZnVuY3Rpb24ocm9vdCwgY2VsbCkge1xyXG5cdFx0dmFyIGNvbmZpZ3MgPSBbXVxyXG5cdFx0aWYgKCFyb290KSB0aHJvdyBuZXcgRXJyb3IoXCJQbGVhc2UgZW5zdXJlIHRoZSBET00gZWxlbWVudCBleGlzdHMgYmVmb3JlIHJlbmRlcmluZyBhIHRlbXBsYXRlIGludG8gaXQuXCIpXHJcblx0XHR2YXIgaWQgPSBnZXRDZWxsQ2FjaGVLZXkocm9vdClcclxuXHRcdHZhciBub2RlID0gcm9vdCA9PSB3aW5kb3cuZG9jdW1lbnQgfHwgcm9vdCA9PSB3aW5kb3cuZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50ID8gZG9jdW1lbnROb2RlIDogcm9vdFxyXG5cdFx0aWYgKGNlbGxDYWNoZVtpZF0gPT09IHVuZGVmaW5lZCkgY2xlYXIobm9kZS5jaGlsZE5vZGVzKVxyXG5cdFx0Y2VsbENhY2hlW2lkXSA9IGJ1aWxkKG5vZGUsIG51bGwsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBjZWxsLCBjZWxsQ2FjaGVbaWRdLCBmYWxzZSwgMCwgbnVsbCwgdW5kZWZpbmVkLCBjb25maWdzKVxyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjb25maWdzLmxlbmd0aDsgaSsrKSBjb25maWdzW2ldKClcclxuXHR9XHJcblx0ZnVuY3Rpb24gZ2V0Q2VsbENhY2hlS2V5KGVsZW1lbnQpIHtcclxuXHRcdHZhciBpbmRleCA9IG5vZGVDYWNoZS5pbmRleE9mKGVsZW1lbnQpXHJcblx0XHRyZXR1cm4gaW5kZXggPCAwID8gbm9kZUNhY2hlLnB1c2goZWxlbWVudCkgLSAxIDogaW5kZXhcclxuXHR9XHJcblxyXG5cdG0udHJ1c3QgPSBmdW5jdGlvbih2YWx1ZSkge1xyXG5cdFx0dmFsdWUgPSBuZXcgU3RyaW5nKHZhbHVlKVxyXG5cdFx0dmFsdWUuJHRydXN0ZWQgPSB0cnVlXHJcblx0XHRyZXR1cm4gdmFsdWVcclxuXHR9XHJcblxyXG5cdHZhciByb290cyA9IFtdLCBtb2R1bGVzID0gW10sIGNvbnRyb2xsZXJzID0gW10sIGxhc3RSZWRyYXdJZCA9IDAsIGNvbXB1dGVQb3N0UmVkcmF3SG9vayA9IG51bGxcclxuXHRtLm1vZHVsZSA9IGZ1bmN0aW9uKHJvb3QsIG1vZHVsZSkge1xyXG5cdFx0dmFyIGluZGV4ID0gcm9vdHMuaW5kZXhPZihyb290KVxyXG5cdFx0aWYgKGluZGV4IDwgMCkgaW5kZXggPSByb290cy5sZW5ndGhcclxuXHRcdHZhciBpc1ByZXZlbnRlZCA9IGZhbHNlXHJcblx0XHRpZiAoY29udHJvbGxlcnNbaW5kZXhdICYmIHR5cGVvZiBjb250cm9sbGVyc1tpbmRleF0ub251bmxvYWQgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdHZhciBldmVudCA9IHtcclxuXHRcdFx0XHRwcmV2ZW50RGVmYXVsdDogZnVuY3Rpb24oKSB7aXNQcmV2ZW50ZWQgPSB0cnVlfVxyXG5cdFx0XHR9XHJcblx0XHRcdGNvbnRyb2xsZXJzW2luZGV4XS5vbnVubG9hZChldmVudClcclxuXHRcdH1cclxuXHRcdGlmICghaXNQcmV2ZW50ZWQpIHtcclxuXHRcdFx0bS5zdGFydENvbXB1dGF0aW9uKClcclxuXHRcdFx0cm9vdHNbaW5kZXhdID0gcm9vdFxyXG5cdFx0XHRtb2R1bGVzW2luZGV4XSA9IG1vZHVsZVxyXG5cdFx0XHRjb250cm9sbGVyc1tpbmRleF0gPSBuZXcgbW9kdWxlLmNvbnRyb2xsZXJcclxuXHRcdFx0bS5lbmRDb21wdXRhdGlvbigpXHJcblx0XHR9XHJcblx0fVxyXG5cdG0ucmVkcmF3ID0gZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgY2FuY2VsID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5jbGVhclRpbWVvdXRcclxuXHRcdHZhciBkZWZlciA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93LnNldFRpbWVvdXRcclxuXHRcdGlmIChsYXN0UmVkcmF3SWQpIHtcclxuXHRcdFx0Y2FuY2VsKGxhc3RSZWRyYXdJZClcclxuXHRcdFx0bGFzdFJlZHJhd0lkID0gZGVmZXIocmVkcmF3LCAwKVxyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHJlZHJhdygpXHJcblx0XHRcdGxhc3RSZWRyYXdJZCA9IGRlZmVyKGZ1bmN0aW9uKCkge2xhc3RSZWRyYXdJZCA9IG51bGx9LCAwKVxyXG5cdFx0fVxyXG5cdH1cclxuXHRmdW5jdGlvbiByZWRyYXcoKSB7XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHJvb3RzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGlmIChjb250cm9sbGVyc1tpXSkgbS5yZW5kZXIocm9vdHNbaV0sIG1vZHVsZXNbaV0udmlldyhjb250cm9sbGVyc1tpXSkpXHJcblx0XHR9XHJcblx0XHRpZiAoY29tcHV0ZVBvc3RSZWRyYXdIb29rKSB7XHJcblx0XHRcdGNvbXB1dGVQb3N0UmVkcmF3SG9vaygpXHJcblx0XHRcdGNvbXB1dGVQb3N0UmVkcmF3SG9vayA9IG51bGxcclxuXHRcdH1cclxuXHRcdGxhc3RSZWRyYXdJZCA9IG51bGxcclxuXHR9XHJcblxyXG5cdHZhciBwZW5kaW5nUmVxdWVzdHMgPSAwXHJcblx0bS5zdGFydENvbXB1dGF0aW9uID0gZnVuY3Rpb24oKSB7cGVuZGluZ1JlcXVlc3RzKyt9XHJcblx0bS5lbmRDb21wdXRhdGlvbiA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0cGVuZGluZ1JlcXVlc3RzID0gTWF0aC5tYXgocGVuZGluZ1JlcXVlc3RzIC0gMSwgMClcclxuXHRcdGlmIChwZW5kaW5nUmVxdWVzdHMgPT0gMCkgbS5yZWRyYXcoKVxyXG5cdH1cclxuXHJcblx0bS53aXRoQXR0ciA9IGZ1bmN0aW9uKHByb3AsIHdpdGhBdHRyQ2FsbGJhY2spIHtcclxuXHRcdHJldHVybiBmdW5jdGlvbihlKSB7XHJcblx0XHRcdGUgPSBlIHx8IGV2ZW50XHJcblx0XHRcdHdpdGhBdHRyQ2FsbGJhY2socHJvcCBpbiBlLmN1cnJlbnRUYXJnZXQgPyBlLmN1cnJlbnRUYXJnZXRbcHJvcF0gOiBlLmN1cnJlbnRUYXJnZXQuZ2V0QXR0cmlidXRlKHByb3ApKVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly9yb3V0aW5nXHJcblx0dmFyIG1vZGVzID0ge3BhdGhuYW1lOiBcIlwiLCBoYXNoOiBcIiNcIiwgc2VhcmNoOiBcIj9cIn1cclxuXHR2YXIgcmVkaXJlY3QgPSBmdW5jdGlvbigpIHt9LCByb3V0ZVBhcmFtcyA9IHt9LCBjdXJyZW50Um91dGVcclxuXHRtLnJvdXRlID0gZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGN1cnJlbnRSb3V0ZVxyXG5cdFx0ZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMyAmJiB0eXBlb2YgYXJndW1lbnRzWzFdID09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0dmFyIHJvb3QgPSBhcmd1bWVudHNbMF0sIGRlZmF1bHRSb3V0ZSA9IGFyZ3VtZW50c1sxXSwgcm91dGVyID0gYXJndW1lbnRzWzJdXHJcblx0XHRcdHJlZGlyZWN0ID0gZnVuY3Rpb24oc291cmNlKSB7XHJcblx0XHRcdFx0dmFyIHBhdGggPSBjdXJyZW50Um91dGUgPSBub3JtYWxpemVSb3V0ZShzb3VyY2UpXHJcblx0XHRcdFx0aWYgKCFyb3V0ZUJ5VmFsdWUocm9vdCwgcm91dGVyLCBwYXRoKSkge1xyXG5cdFx0XHRcdFx0bS5yb3V0ZShkZWZhdWx0Um91dGUsIHRydWUpXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdHZhciBsaXN0ZW5lciA9IG0ucm91dGUubW9kZSA9PSBcImhhc2hcIiA/IFwib25oYXNoY2hhbmdlXCIgOiBcIm9ucG9wc3RhdGVcIlxyXG5cdFx0XHR3aW5kb3dbbGlzdGVuZXJdID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0aWYgKGN1cnJlbnRSb3V0ZSAhPSBub3JtYWxpemVSb3V0ZSh3aW5kb3cubG9jYXRpb25bbS5yb3V0ZS5tb2RlXSkpIHtcclxuXHRcdFx0XHRcdHJlZGlyZWN0KHdpbmRvdy5sb2NhdGlvblttLnJvdXRlLm1vZGVdKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRjb21wdXRlUG9zdFJlZHJhd0hvb2sgPSBzZXRTY3JvbGxcclxuXHRcdFx0d2luZG93W2xpc3RlbmVyXSgpXHJcblx0XHR9XHJcblx0XHRlbHNlIGlmIChhcmd1bWVudHNbMF0uYWRkRXZlbnRMaXN0ZW5lcikge1xyXG5cdFx0XHR2YXIgZWxlbWVudCA9IGFyZ3VtZW50c1swXVxyXG5cdFx0XHR2YXIgaXNJbml0aWFsaXplZCA9IGFyZ3VtZW50c1sxXVxyXG5cdFx0XHRpZiAoZWxlbWVudC5ocmVmLmluZGV4T2YobW9kZXNbbS5yb3V0ZS5tb2RlXSkgPCAwKSB7XHJcblx0XHRcdFx0ZWxlbWVudC5ocmVmID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lICsgbW9kZXNbbS5yb3V0ZS5tb2RlXSArIGVsZW1lbnQucGF0aG5hbWVcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoIWlzSW5pdGlhbGl6ZWQpIHtcclxuXHRcdFx0XHRlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCByb3V0ZVVub2J0cnVzaXZlKVxyXG5cdFx0XHRcdGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHJvdXRlVW5vYnRydXNpdmUpXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGVsc2UgaWYgKHR5cGVvZiBhcmd1bWVudHNbMF0gPT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRjdXJyZW50Um91dGUgPSBhcmd1bWVudHNbMF1cclxuXHRcdFx0dmFyIHF1ZXJ5c3RyaW5nID0gdHlwZW9mIGFyZ3VtZW50c1sxXSA9PSBcIm9iamVjdFwiID8gYnVpbGRRdWVyeVN0cmluZyhhcmd1bWVudHNbMV0pIDogbnVsbFxyXG5cdFx0XHRpZiAocXVlcnlzdHJpbmcpIGN1cnJlbnRSb3V0ZSArPSAoY3VycmVudFJvdXRlLmluZGV4T2YoXCI/XCIpID09PSAtMSA/IFwiP1wiIDogXCImXCIpICsgcXVlcnlzdHJpbmdcclxuXHJcblx0XHRcdHZhciBzaG91bGRSZXBsYWNlSGlzdG9yeUVudHJ5ID0gKGFyZ3VtZW50cy5sZW5ndGggPT0gMyA/IGFyZ3VtZW50c1syXSA6IGFyZ3VtZW50c1sxXSkgPT09IHRydWVcclxuXHRcdFx0XHJcblx0XHRcdGlmICh3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUpIHtcclxuXHRcdFx0XHRjb21wdXRlUG9zdFJlZHJhd0hvb2sgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdHdpbmRvdy5oaXN0b3J5W3Nob3VsZFJlcGxhY2VIaXN0b3J5RW50cnkgPyBcInJlcGxhY2VTdGF0ZVwiIDogXCJwdXNoU3RhdGVcIl0obnVsbCwgd2luZG93LmRvY3VtZW50LnRpdGxlLCBtb2Rlc1ttLnJvdXRlLm1vZGVdICsgY3VycmVudFJvdXRlKVxyXG5cdFx0XHRcdFx0c2V0U2Nyb2xsKClcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmVkaXJlY3QobW9kZXNbbS5yb3V0ZS5tb2RlXSArIGN1cnJlbnRSb3V0ZSlcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHdpbmRvdy5sb2NhdGlvblttLnJvdXRlLm1vZGVdID0gY3VycmVudFJvdXRlXHJcblx0XHR9XHJcblx0fVxyXG5cdG0ucm91dGUucGFyYW0gPSBmdW5jdGlvbihrZXkpIHtyZXR1cm4gcm91dGVQYXJhbXNba2V5XX1cclxuXHRtLnJvdXRlLm1vZGUgPSBcInNlYXJjaFwiXHJcblx0ZnVuY3Rpb24gbm9ybWFsaXplUm91dGUocm91dGUpIHtyZXR1cm4gcm91dGUuc2xpY2UobW9kZXNbbS5yb3V0ZS5tb2RlXS5sZW5ndGgpfVxyXG5cdGZ1bmN0aW9uIHJvdXRlQnlWYWx1ZShyb290LCByb3V0ZXIsIHBhdGgpIHtcclxuXHRcdHJvdXRlUGFyYW1zID0ge31cclxuXHJcblx0XHR2YXIgcXVlcnlTdGFydCA9IHBhdGguaW5kZXhPZihcIj9cIilcclxuXHRcdGlmIChxdWVyeVN0YXJ0ICE9PSAtMSkge1xyXG5cdFx0XHRyb3V0ZVBhcmFtcyA9IHBhcnNlUXVlcnlTdHJpbmcocGF0aC5zdWJzdHIocXVlcnlTdGFydCArIDEsIHBhdGgubGVuZ3RoKSlcclxuXHRcdFx0cGF0aCA9IHBhdGguc3Vic3RyKDAsIHF1ZXJ5U3RhcnQpXHJcblx0XHR9XHJcblxyXG5cdFx0Zm9yICh2YXIgcm91dGUgaW4gcm91dGVyKSB7XHJcblx0XHRcdGlmIChyb3V0ZSA9PSBwYXRoKSB7XHJcblx0XHRcdFx0cmVzZXQocm9vdClcclxuXHRcdFx0XHRtLm1vZHVsZShyb290LCByb3V0ZXJbcm91dGVdKVxyXG5cdFx0XHRcdHJldHVybiB0cnVlXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhciBtYXRjaGVyID0gbmV3IFJlZ0V4cChcIl5cIiArIHJvdXRlLnJlcGxhY2UoLzpbXlxcL10rP1xcLnszfS9nLCBcIiguKj8pXCIpLnJlcGxhY2UoLzpbXlxcL10rL2csIFwiKFteXFxcXC9dKylcIikgKyBcIlxcLz8kXCIpXHJcblxyXG5cdFx0XHRpZiAobWF0Y2hlci50ZXN0KHBhdGgpKSB7XHJcblx0XHRcdFx0cmVzZXQocm9vdClcclxuXHRcdFx0XHRwYXRoLnJlcGxhY2UobWF0Y2hlciwgZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHR2YXIga2V5cyA9IHJvdXRlLm1hdGNoKC86W15cXC9dKy9nKSB8fCBbXVxyXG5cdFx0XHRcdFx0dmFyIHZhbHVlcyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxLCAtMilcclxuXHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykgcm91dGVQYXJhbXNba2V5c1tpXS5yZXBsYWNlKC86fFxcLi9nLCBcIlwiKV0gPSBkZWNvZGVTcGFjZSh2YWx1ZXNbaV0pXHJcblx0XHRcdFx0XHRtLm1vZHVsZShyb290LCByb3V0ZXJbcm91dGVdKVxyXG5cdFx0XHRcdH0pXHJcblx0XHRcdFx0cmV0dXJuIHRydWVcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHRmdW5jdGlvbiByZXNldChyb290KSB7XHJcblx0XHR2YXIgY2FjaGVLZXkgPSBnZXRDZWxsQ2FjaGVLZXkocm9vdClcclxuXHRcdGNsZWFyKHJvb3QuY2hpbGROb2RlcywgY2VsbENhY2hlW2NhY2hlS2V5XSlcclxuXHRcdGNlbGxDYWNoZVtjYWNoZUtleV0gPSB1bmRlZmluZWRcclxuXHR9XHJcblx0ZnVuY3Rpb24gcm91dGVVbm9idHJ1c2l2ZShlKSB7XHJcblx0XHRlID0gZSB8fCBldmVudFxyXG5cdFx0aWYgKGUuY3RybEtleSB8fCBlLm1ldGFLZXkgfHwgZS53aGljaCA9PSAyKSByZXR1cm5cclxuXHRcdGUucHJldmVudERlZmF1bHQoKVxyXG5cdFx0bS5yb3V0ZShlLmN1cnJlbnRUYXJnZXRbbS5yb3V0ZS5tb2RlXS5zbGljZShtb2Rlc1ttLnJvdXRlLm1vZGVdLmxlbmd0aCkpXHJcblx0fVxyXG5cdGZ1bmN0aW9uIHNldFNjcm9sbCgpIHtcclxuXHRcdGlmIChtLnJvdXRlLm1vZGUgIT0gXCJoYXNoXCIgJiYgd2luZG93LmxvY2F0aW9uLmhhc2gpIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2hcclxuXHRcdGVsc2Ugd2luZG93LnNjcm9sbFRvKDAsIDApXHJcblx0fVxyXG5cdGZ1bmN0aW9uIGJ1aWxkUXVlcnlTdHJpbmcob2JqZWN0LCBwcmVmaXgpIHtcclxuXHRcdHZhciBzdHIgPSBbXVxyXG5cdFx0Zm9yKHZhciBwcm9wIGluIG9iamVjdCkge1xyXG5cdFx0XHR2YXIga2V5ID0gcHJlZml4ID8gcHJlZml4ICsgXCJbXCIgKyBwcm9wICsgXCJdXCIgOiBwcm9wLCB2YWx1ZSA9IG9iamVjdFtwcm9wXVxyXG5cdFx0XHRzdHIucHVzaCh0eXBlb2YgdmFsdWUgPT0gXCJvYmplY3RcIiA/IGJ1aWxkUXVlcnlTdHJpbmcodmFsdWUsIGtleSkgOiBlbmNvZGVVUklDb21wb25lbnQoa2V5KSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKSlcclxuXHRcdH1cclxuXHRcdHJldHVybiBzdHIuam9pbihcIiZcIilcclxuXHR9XHJcblx0ZnVuY3Rpb24gcGFyc2VRdWVyeVN0cmluZyhzdHIpIHtcclxuXHRcdHZhciBwYWlycyA9IHN0ci5zcGxpdChcIiZcIiksIHBhcmFtcyA9IHt9XHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHBhaXJzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHZhciBwYWlyID0gcGFpcnNbaV0uc3BsaXQoXCI9XCIpXHJcblx0XHRcdHBhcmFtc1tkZWNvZGVTcGFjZShwYWlyWzBdKV0gPSBwYWlyWzFdID8gZGVjb2RlU3BhY2UocGFpclsxXSkgOiAocGFpci5sZW5ndGggPT09IDEgPyB0cnVlIDogXCJcIilcclxuXHRcdH1cclxuXHRcdHJldHVybiBwYXJhbXNcclxuXHR9XHJcblx0ZnVuY3Rpb24gZGVjb2RlU3BhY2Uoc3RyaW5nKSB7XHJcblx0XHRyZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0cmluZy5yZXBsYWNlKC9cXCsvZywgXCIgXCIpKVxyXG5cdH1cclxuXHJcblx0Ly9tb2RlbFxyXG5cdG0ucHJvcCA9IGZ1bmN0aW9uKHN0b3JlKSB7XHJcblx0XHR2YXIgcHJvcCA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCkgc3RvcmUgPSBhcmd1bWVudHNbMF1cclxuXHRcdFx0cmV0dXJuIHN0b3JlXHJcblx0XHR9XHJcblx0XHRwcm9wLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRyZXR1cm4gc3RvcmVcclxuXHRcdH1cclxuXHRcdHJldHVybiBwcm9wXHJcblx0fVxyXG5cclxuXHR2YXIgbm9uZSA9IHt9XHJcblx0bS5kZWZlcnJlZCA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHJlc29sdmVycyA9IFtdLCByZWplY3RlcnMgPSBbXSwgcmVzb2x2ZWQgPSBub25lLCByZWplY3RlZCA9IG5vbmUsIHByb21pc2UgPSBtLnByb3AoKVxyXG5cdFx0dmFyIG9iamVjdCA9IHtcclxuXHRcdFx0cmVzb2x2ZTogZnVuY3Rpb24odmFsdWUpIHtcclxuXHRcdFx0XHRpZiAocmVzb2x2ZWQgPT09IG5vbmUpIHByb21pc2UocmVzb2x2ZWQgPSB2YWx1ZSlcclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHJlc29sdmVycy5sZW5ndGg7IGkrKykgcmVzb2x2ZXJzW2ldKHZhbHVlKVxyXG5cdFx0XHRcdHJlc29sdmVycy5sZW5ndGggPSByZWplY3RlcnMubGVuZ3RoID0gMFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRyZWplY3Q6IGZ1bmN0aW9uKHZhbHVlKSB7XHJcblx0XHRcdFx0aWYgKHJlamVjdGVkID09PSBub25lKSByZWplY3RlZCA9IHZhbHVlXHJcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCByZWplY3RlcnMubGVuZ3RoOyBpKyspIHJlamVjdGVyc1tpXSh2YWx1ZSlcclxuXHRcdFx0XHRyZXNvbHZlcnMubGVuZ3RoID0gcmVqZWN0ZXJzLmxlbmd0aCA9IDBcclxuXHRcdFx0fSxcclxuXHRcdFx0cHJvbWlzZTogcHJvbWlzZVxyXG5cdFx0fVxyXG5cdFx0b2JqZWN0LnByb21pc2UucmVzb2x2ZXJzID0gcmVzb2x2ZXJzXHJcblx0XHRvYmplY3QucHJvbWlzZS50aGVuID0gZnVuY3Rpb24oc3VjY2VzcywgZXJyb3IpIHtcclxuXHRcdFx0dmFyIG5leHQgPSBtLmRlZmVycmVkKClcclxuXHRcdFx0aWYgKCFzdWNjZXNzKSBzdWNjZXNzID0gaWRlbnRpdHlcclxuXHRcdFx0aWYgKCFlcnJvcikgZXJyb3IgPSBpZGVudGl0eVxyXG5cdFx0XHRmdW5jdGlvbiBjYWxsYmFjayhtZXRob2QsIGNhbGxiYWNrKSB7XHJcblx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XHJcblx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHR2YXIgcmVzdWx0ID0gY2FsbGJhY2sodmFsdWUpXHJcblx0XHRcdFx0XHRcdGlmIChyZXN1bHQgJiYgdHlwZW9mIHJlc3VsdC50aGVuID09IFwiZnVuY3Rpb25cIikgcmVzdWx0LnRoZW4obmV4dFttZXRob2RdLCBlcnJvcilcclxuXHRcdFx0XHRcdFx0ZWxzZSBuZXh0W21ldGhvZF0ocmVzdWx0ICE9PSB1bmRlZmluZWQgPyByZXN1bHQgOiB2YWx1ZSlcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGNhdGNoIChlKSB7XHJcblx0XHRcdFx0XHRcdGlmIChlIGluc3RhbmNlb2YgRXJyb3IgJiYgZS5jb25zdHJ1Y3RvciAhPT0gRXJyb3IpIHRocm93IGVcclxuXHRcdFx0XHRcdFx0ZWxzZSBuZXh0LnJlamVjdChlKVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAocmVzb2x2ZWQgIT09IG5vbmUpIGNhbGxiYWNrKFwicmVzb2x2ZVwiLCBzdWNjZXNzKShyZXNvbHZlZClcclxuXHRcdFx0ZWxzZSBpZiAocmVqZWN0ZWQgIT09IG5vbmUpIGNhbGxiYWNrKFwicmVqZWN0XCIsIGVycm9yKShyZWplY3RlZClcclxuXHRcdFx0ZWxzZSB7XHJcblx0XHRcdFx0cmVzb2x2ZXJzLnB1c2goY2FsbGJhY2soXCJyZXNvbHZlXCIsIHN1Y2Nlc3MpKVxyXG5cdFx0XHRcdHJlamVjdGVycy5wdXNoKGNhbGxiYWNrKFwicmVqZWN0XCIsIGVycm9yKSlcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gbmV4dC5wcm9taXNlXHJcblx0XHR9XHJcblx0XHRyZXR1cm4gb2JqZWN0XHJcblx0fVxyXG5cdG0uc3luYyA9IGZ1bmN0aW9uKGFyZ3MpIHtcclxuXHRcdHZhciBtZXRob2QgPSBcInJlc29sdmVcIlxyXG5cdFx0ZnVuY3Rpb24gc3luY2hyb25pemVyKHBvcywgcmVzb2x2ZWQpIHtcclxuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XHJcblx0XHRcdFx0cmVzdWx0c1twb3NdID0gdmFsdWVcclxuXHRcdFx0XHRpZiAoIXJlc29sdmVkKSBtZXRob2QgPSBcInJlamVjdFwiXHJcblx0XHRcdFx0aWYgKC0tb3V0c3RhbmRpbmcgPT0gMCkge1xyXG5cdFx0XHRcdFx0ZGVmZXJyZWQucHJvbWlzZShyZXN1bHRzKVxyXG5cdFx0XHRcdFx0ZGVmZXJyZWRbbWV0aG9kXShyZXN1bHRzKVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gdmFsdWVcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBkZWZlcnJlZCA9IG0uZGVmZXJyZWQoKVxyXG5cdFx0dmFyIG91dHN0YW5kaW5nID0gYXJncy5sZW5ndGhcclxuXHRcdHZhciByZXN1bHRzID0gbmV3IEFycmF5KG91dHN0YW5kaW5nKVxyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGFyZ3NbaV0udGhlbihzeW5jaHJvbml6ZXIoaSwgdHJ1ZSksIHN5bmNocm9uaXplcihpLCBmYWxzZSkpXHJcblx0XHR9XHJcblx0XHRyZXR1cm4gZGVmZXJyZWQucHJvbWlzZVxyXG5cdH1cclxuXHRmdW5jdGlvbiBpZGVudGl0eSh2YWx1ZSkge3JldHVybiB2YWx1ZX1cclxuXHJcblx0ZnVuY3Rpb24gYWpheChvcHRpb25zKSB7XHJcblx0XHR2YXIgeGhyID0gbmV3IHdpbmRvdy5YTUxIdHRwUmVxdWVzdFxyXG5cdFx0eGhyLm9wZW4ob3B0aW9ucy5tZXRob2QsIG9wdGlvbnMudXJsLCB0cnVlLCBvcHRpb25zLnVzZXIsIG9wdGlvbnMucGFzc3dvcmQpXHJcblx0XHR4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gNCkge1xyXG5cdFx0XHRcdGlmICh4aHIuc3RhdHVzID49IDIwMCAmJiB4aHIuc3RhdHVzIDwgMzAwKSBvcHRpb25zLm9ubG9hZCh7dHlwZTogXCJsb2FkXCIsIHRhcmdldDogeGhyfSlcclxuXHRcdFx0XHRlbHNlIG9wdGlvbnMub25lcnJvcih7dHlwZTogXCJlcnJvclwiLCB0YXJnZXQ6IHhocn0pXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGlmIChvcHRpb25zLnNlcmlhbGl6ZSA9PSBKU09OLnN0cmluZ2lmeSAmJiBvcHRpb25zLm1ldGhvZCAhPSBcIkdFVFwiKSB7XHJcblx0XHRcdHhoci5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiKTtcclxuXHRcdH1cclxuXHRcdGlmICh0eXBlb2Ygb3B0aW9ucy5jb25maWcgPT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdHZhciBtYXliZVhociA9IG9wdGlvbnMuY29uZmlnKHhociwgb3B0aW9ucylcclxuXHRcdFx0aWYgKG1heWJlWGhyICE9PSB1bmRlZmluZWQpIHhociA9IG1heWJlWGhyXHJcblx0XHR9XHJcblx0XHR4aHIuc2VuZChvcHRpb25zLm1ldGhvZCA9PSBcIkdFVFwiID8gXCJcIiA6IG9wdGlvbnMuZGF0YSlcclxuXHRcdHJldHVybiB4aHJcclxuXHR9XHJcblx0ZnVuY3Rpb24gYmluZERhdGEoeGhyT3B0aW9ucywgZGF0YSwgc2VyaWFsaXplKSB7XHJcblx0XHRpZiAoZGF0YSAmJiBPYmplY3Qua2V5cyhkYXRhKS5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGlmICh4aHJPcHRpb25zLm1ldGhvZCA9PSBcIkdFVFwiKSB7XHJcblx0XHRcdFx0eGhyT3B0aW9ucy51cmwgPSB4aHJPcHRpb25zLnVybCArICh4aHJPcHRpb25zLnVybC5pbmRleE9mKFwiP1wiKSA8IDAgPyBcIj9cIiA6IFwiJlwiKSArIGJ1aWxkUXVlcnlTdHJpbmcoZGF0YSlcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHhock9wdGlvbnMuZGF0YSA9IHNlcmlhbGl6ZShkYXRhKVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHhock9wdGlvbnNcclxuXHR9XHJcblx0ZnVuY3Rpb24gcGFyYW1ldGVyaXplVXJsKHVybCwgZGF0YSkge1xyXG5cdFx0dmFyIHRva2VucyA9IHVybC5tYXRjaCgvOlthLXpdXFx3Ky9naSlcclxuXHRcdGlmICh0b2tlbnMgJiYgZGF0YSkge1xyXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdHZhciBrZXkgPSB0b2tlbnNbaV0uc2xpY2UoMSlcclxuXHRcdFx0XHR1cmwgPSB1cmwucmVwbGFjZSh0b2tlbnNbaV0sIGRhdGFba2V5XSlcclxuXHRcdFx0XHRkZWxldGUgZGF0YVtrZXldXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiB1cmxcclxuXHR9XHJcblxyXG5cdG0ucmVxdWVzdCA9IGZ1bmN0aW9uKHhock9wdGlvbnMpIHtcclxuXHRcdGlmICh4aHJPcHRpb25zLmJhY2tncm91bmQgIT09IHRydWUpIG0uc3RhcnRDb21wdXRhdGlvbigpXHJcblx0XHR2YXIgZGVmZXJyZWQgPSBtLmRlZmVycmVkKClcclxuXHRcdHZhciBzZXJpYWxpemUgPSB4aHJPcHRpb25zLnNlcmlhbGl6ZSA9IHhock9wdGlvbnMuc2VyaWFsaXplIHx8IEpTT04uc3RyaW5naWZ5XHJcblx0XHR2YXIgZGVzZXJpYWxpemUgPSB4aHJPcHRpb25zLmRlc2VyaWFsaXplID0geGhyT3B0aW9ucy5kZXNlcmlhbGl6ZSB8fCBKU09OLnBhcnNlXHJcblx0XHR2YXIgZXh0cmFjdCA9IHhock9wdGlvbnMuZXh0cmFjdCB8fCBmdW5jdGlvbih4aHIpIHtcclxuXHRcdFx0cmV0dXJuIHhoci5yZXNwb25zZVRleHQubGVuZ3RoID09PSAwICYmIGRlc2VyaWFsaXplID09PSBKU09OLnBhcnNlID8gbnVsbCA6IHhoci5yZXNwb25zZVRleHRcclxuXHRcdH1cclxuXHRcdHhock9wdGlvbnMudXJsID0gcGFyYW1ldGVyaXplVXJsKHhock9wdGlvbnMudXJsLCB4aHJPcHRpb25zLmRhdGEpXHJcblx0XHR4aHJPcHRpb25zID0gYmluZERhdGEoeGhyT3B0aW9ucywgeGhyT3B0aW9ucy5kYXRhLCBzZXJpYWxpemUpXHJcblx0XHR4aHJPcHRpb25zLm9ubG9hZCA9IHhock9wdGlvbnMub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRlID0gZSB8fCBldmVudFxyXG5cdFx0XHRcdHZhciB1bndyYXAgPSAoZS50eXBlID09IFwibG9hZFwiID8geGhyT3B0aW9ucy51bndyYXBTdWNjZXNzIDogeGhyT3B0aW9ucy51bndyYXBFcnJvcikgfHwgaWRlbnRpdHlcclxuXHRcdFx0XHR2YXIgcmVzcG9uc2UgPSB1bndyYXAoZGVzZXJpYWxpemUoZXh0cmFjdChlLnRhcmdldCwgeGhyT3B0aW9ucykpKVxyXG5cdFx0XHRcdGlmIChlLnR5cGUgPT0gXCJsb2FkXCIpIHtcclxuXHRcdFx0XHRcdGlmIChyZXNwb25zZSBpbnN0YW5jZW9mIEFycmF5ICYmIHhock9wdGlvbnMudHlwZSkge1xyXG5cdFx0XHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHJlc3BvbnNlLmxlbmd0aDsgaSsrKSByZXNwb25zZVtpXSA9IG5ldyB4aHJPcHRpb25zLnR5cGUocmVzcG9uc2VbaV0pXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRlbHNlIGlmICh4aHJPcHRpb25zLnR5cGUpIHJlc3BvbnNlID0gbmV3IHhock9wdGlvbnMudHlwZShyZXNwb25zZSlcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZGVmZXJyZWRbZS50eXBlID09IFwibG9hZFwiID8gXCJyZXNvbHZlXCIgOiBcInJlamVjdFwiXShyZXNwb25zZSlcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXRjaCAoZSkge1xyXG5cdFx0XHRcdGlmIChlIGluc3RhbmNlb2YgU3ludGF4RXJyb3IpIHRocm93IG5ldyBTeW50YXhFcnJvcihcIkNvdWxkIG5vdCBwYXJzZSBIVFRQIHJlc3BvbnNlLiBTZWUgaHR0cDovL2xob3JpZS5naXRodWIuaW8vbWl0aHJpbC9taXRocmlsLnJlcXVlc3QuaHRtbCN1c2luZy12YXJpYWJsZS1kYXRhLWZvcm1hdHNcIilcclxuXHRcdFx0XHRlbHNlIGlmIChlIGluc3RhbmNlb2YgRXJyb3IgJiYgZS5jb25zdHJ1Y3RvciAhPT0gRXJyb3IpIHRocm93IGVcclxuXHRcdFx0XHRlbHNlIGRlZmVycmVkLnJlamVjdChlKVxyXG5cdFx0XHR9XHJcblx0XHRcdGlmICh4aHJPcHRpb25zLmJhY2tncm91bmQgIT09IHRydWUpIG0uZW5kQ29tcHV0YXRpb24oKVxyXG5cdFx0fVxyXG5cdFx0YWpheCh4aHJPcHRpb25zKVxyXG5cdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2VcclxuXHR9XHJcblxyXG5cdC8vdGVzdGluZyBBUElcclxuXHRtLmRlcHMgPSBmdW5jdGlvbihtb2NrKSB7cmV0dXJuIHdpbmRvdyA9IG1vY2t9XHJcblx0Ly9mb3IgaW50ZXJuYWwgdGVzdGluZyBvbmx5LCBkbyBub3QgdXNlIGBtLmRlcHMuZmFjdG9yeWBcclxuXHRtLmRlcHMuZmFjdG9yeSA9IGFwcFxyXG5cclxuXHRyZXR1cm4gbVxyXG59KHR5cGVvZiB3aW5kb3cgIT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUgIT09IG51bGwpIG1vZHVsZS5leHBvcnRzID0gbVxyXG5pZiAodHlwZW9mIGRlZmluZSA9PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkgZGVmaW5lKGZ1bmN0aW9uKCkge3JldHVybiBtfSlcclxuXHJcbjs7O1xyXG4iLCJtID0gcmVxdWlyZSgnbWl0aHJpbCcpO1xuXG4vL3RoaXMgYXBwbGljYXRpb24gb25seSBoYXMgb25lIG1vZHVsZTogdG9kb1xudmFyIHRvZG8gPSB7fTtcblxuLy9mb3Igc2ltcGxpY2l0eSwgd2UgdXNlIHRoaXMgbW9kdWxlIHRvIG5hbWVzcGFjZSB0aGUgbW9kZWwgY2xhc3Nlc1xuXG4vL3RoZSBUb2RvIGNsYXNzIGhhcyB0d28gcHJvcGVydGllc1xudG9kby5Ub2RvID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIHRoaXMuZGVzY3JpcHRpb24gPSBtLnByb3AoZGF0YS5kZXNjcmlwdGlvbik7XG4gICAgdGhpcy5kb25lID0gbS5wcm9wKGZhbHNlKTtcbn07XG5cbi8vdGhlIFRvZG9MaXN0IGNsYXNzIGlzIGEgbGlzdCBvZiBUb2RvJ3NcbnRvZG8uVG9kb0xpc3QgPSBBcnJheTtcblxuLy90aGUgY29udHJvbGxlciB1c2VzIHRocmVlIG1vZGVsLWxldmVsIGVudGl0aWVzLCBvZiB3aGljaCBvbmUgaXMgYSBjdXN0b20gZGVmaW5lZCBjbGFzczpcbi8vYFRvZG9gIGlzIHRoZSBjZW50cmFsIGNsYXNzIGluIHRoaXMgYXBwbGljYXRpb25cbi8vYGxpc3RgIGlzIG1lcmVseSBhIGdlbmVyaWMgYXJyYXksIHdpdGggc3RhbmRhcmQgYXJyYXkgbWV0aG9kc1xuLy9gZGVzY3JpcHRpb25gIGlzIGEgdGVtcG9yYXJ5IHN0b3JhZ2UgYm94IHRoYXQgaG9sZHMgYSBzdHJpbmdcbi8vXG4vL3RoZSBgYWRkYCBtZXRob2Qgc2ltcGx5IGFkZHMgYSBuZXcgdG9kbyB0byB0aGUgbGlzdFxudG9kby5jb250cm9sbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5saXN0ID0gbmV3IHRvZG8uVG9kb0xpc3QoKTtcbiAgICB0aGlzLmRlc2NyaXB0aW9uID0gbS5wcm9wKFwiXCIpO1xuXG4gICAgdGhpcy5hZGQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuZGVzY3JpcHRpb24oKSkge1xuICAgICAgICAgICAgdGhpcy5saXN0LnB1c2gobmV3IHRvZG8uVG9kbyh7ZGVzY3JpcHRpb246IHRoaXMuZGVzY3JpcHRpb24oKX0pKTtcbiAgICAgICAgICAgIHRoaXMuZGVzY3JpcHRpb24oXCJcIik7XG4gICAgICAgIH1cbiAgICB9LmJpbmQodGhpcyk7XG59O1xuXG4vL2hlcmUncyB0aGUgdmlld1xudG9kby52aWV3ID0gZnVuY3Rpb24oY3RybCkge1xuICAgIHJldHVybiBtKFwiaHRtbFwiLCBbXG4gICAgICAgIG0oXCJib2R5XCIsIFtcbiAgICAgICAgICAgIG0oXCJpbnB1dFwiLCB7b25jaGFuZ2U6IG0ud2l0aEF0dHIoXCJ2YWx1ZVwiLCBjdHJsLmRlc2NyaXB0aW9uKSwgdmFsdWU6IGN0cmwuZGVzY3JpcHRpb24oKX0pLFxuICAgICAgICAgICAgbShcImJ1dHRvblwiLCB7b25jbGljazogY3RybC5hZGR9LCBcIkFkZFwiKSxcbiAgICAgICAgICAgIG0oXCJ0YWJsZVwiLCBbXG4gICAgICAgICAgICAgICAgY3RybC5saXN0Lm1hcChmdW5jdGlvbih0YXNrLCBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbShcInRyXCIsIFtcbiAgICAgICAgICAgICAgICAgICAgICAgIG0oXCJ0ZFwiLCBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbShcImlucHV0W3R5cGU9Y2hlY2tib3hdXCIsIHtvbmNsaWNrOiBtLndpdGhBdHRyKFwiY2hlY2tlZFwiLCB0YXNrLmRvbmUpLCBjaGVja2VkOiB0YXNrLmRvbmUoKX0pXG4gICAgICAgICAgICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG0oXCJ0ZFwiLCB7c3R5bGU6IHt0ZXh0RGVjb3JhdGlvbjogdGFzay5kb25lKCkgPyBcImxpbmUtdGhyb3VnaFwiIDogXCJub25lXCJ9fSwgdGFzay5kZXNjcmlwdGlvbigpKSxcbiAgICAgICAgICAgICAgICAgICAgXSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgXSlcbiAgICAgICAgXSlcbiAgICBdKTtcbn07XG5cbi8vaW5pdGlhbGl6ZSB0aGUgYXBwbGljYXRpb25cbm0ubW9kdWxlKGRvY3VtZW50LCB0b2RvKTtcbiJdfQ==
