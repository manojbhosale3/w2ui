/************************************************************************
*	Library: Web 2.0 UI for jQuery (using prototypical inheritance)
*	- Following objects defined
*		- w2listview		- listview widget
*		- $().w2listview	- jQuery wrapper
*	- Dependencies: jQuery, w2utils
*
* == NICE TO HAVE ==
*	- images support
*	- PgUp/PgDown keys support
*
************************************************************************/

(function () {
	var w2listview = function (options) {
		this.box			= null;		// DOM Element that holds the element
		this.name			= null;		// unique name for w2ui
		this.vType			= null;
		this.extraCols		= [];
		this.itemExtra = {};
		this.items			= [];
		this.menu			= [];
		this.multiselect	= true;		// multiselect support
		this.keyboard		= true;		// keyboard support
		this.curFocused		= null;		// currently focused item
		this.selStart		= null;		// item to start selection from (used in selection with "shift" key)
		this.onClick		= null;
		this.onDblClick		= null;
		this.onKeydown		= null;
		this.onContextMenu	= null;
		this.onMenuClick	= null;		// when context menu item selected
		this.onRender		= null;
		this.onRefresh		= null;
		this.onDestroy		= null;

		$.extend(true, this, w2obj.listview, options);
		for (var i = 0; i < this.extraCols.length; i++) {
			this.itemExtra[this.extraCols[i].name] = '';
		}
	};

	// ====================================================
	// -- Registers as a jQuery plugin

	$.fn.w2listview = function(method) {
		var obj;
		if (typeof method === 'object' || !method ) {
			// check name parameter
			if (!$.fn.w2checkNameParam(method, 'w2listview')) return undefined;
			if (typeof method.viewType !== 'undefined') {
				method.vType = method.viewType;
				delete method.viewType;
			}
			var itms = method.items;
			obj = new w2listview(method);
			$.extend(obj, { items: [], handlers: [] });
			if ($.isArray(itms)) {
				for (var i = 0; i < itms.length; i++) {
					obj.items[i] = $.extend({}, w2listview.prototype.item, obj.itemExtra, itms[i]);
				}
			}
			if ($(this).length !== 0) {
				obj.render($(this)[0]);
			}
			// register new object
			w2ui[obj.name] = obj;
			return obj;
		} else if (w2ui[$(this).attr('name')]) {
			obj = w2ui[$(this).attr('name')];
			obj[method].apply(obj, Array.prototype.slice.call(arguments, 1));
			return this;
		} else {
			console.log('ERROR: Method ' +  method + ' does not exist on jQuery.w2listview' );
			return undefined;
		}
	};

	// ====================================================
	// -- Implementation of core functionality

	w2listview.prototype = {
		item : {
			id				: null,		// param to be sent to all event handlers
			caption			: '',
			description		: '',
			icon			: null,
			img				: null,
			selected		: false,
			onClick			: null,
			onDblClick		: null,
			onKeydown		: null,
			onContextMenu	: null,
			onRefresh		: null
		},

		viewType: function (value) {
			if (arguments.length === 0) {
				switch (this.vType) {
					case 'table':
						return 'table';
					case 'icon-tile':
						return 'icon-tile';
					case 'icon-large':
						return 'icon-large';
					case 'icon-medium':
						return 'icon-medium';
					default:
						return 'icon-small';
				}
			} else {
				this.vType = value;
				var vt = 'w2ui-' + this.viewType();
				$(this.box)
					.removeClass('w2ui-icon-small w2ui-icon-medium w2ui-icon-large w2ui-icon-tile w2ui-table')
					.addClass(vt);
				return vt;
			}
		},

		add: function (item) {
			return this.insert(null, item);
		},

		insert: function (id, item) {
			if (!$.isArray(item)) item = [item];
			// assume it is array
			for (var r = 0; r < item.length; r++) {
				// checks
				if (typeof item[r].id === 'undefined') {
					console.log('ERROR: The parameter "id" is required but not supplied. (obj: '+ this.name +')');
					return;
				}
				var unique = true;
				for (var i = 0; i < this.items.length; i++) {
					if (this.items[i].id == item[r].id) { unique = false; break; }
				}
				if (!unique) {
					console.log('ERROR: The parameter "id='+ item[r].id +'" is not unique within the current items. (obj: '+ this.name +')');
					return;
				}
				// add item
				var newItm = $.extend({}, w2listview.prototype.item, this.itemExtra, item[r]);
				if (id === null || typeof id === 'undefined') {
					this.items.push(newItm);
				} else {
					var middle = this.get(id, true);
					this.items = this.items.slice(0, middle).concat([newItm], this.items.slice(middle));
				}
				this.refresh(item[r].id);
			}
		},

		remove: function (id) {
			var removed = 0;
			for (var i = 0; i < arguments.length; i++) {
				var idx = this.get(arguments[i], true);
				if (idx === null) return false;
				removed++;
				// remove from array
				this.items.splice(idx, 1);
				// remove from screen
				$('#itm_'+ w2utils.escapeId(arguments[i])).remove();
			}
			return removed;
		},

		set: function (id, item) {
			var idx = this.get(id, true);
			if (idx === null) return false;
			$.extend(this.items[idx], item);
			this.refresh(id);
			return true;
		},

		get: function (id, returnIndex) {
			var i = 0;
			if (arguments.length === 0) {
				var all = [];
				for (; i < this.items.length; i++) if (this.items[i].id !== null) all.push(this.items[i].id);
				return all;
			}
			for (; i < this.items.length; i++) {
				if (this.items[i].id === id) {
					if (returnIndex === true) return i; else return this.items[i];
				}
			}
			return null;
		},

		select: function (id, addSelection) {
			var itm = this.get(id);
			if (itm === null) return false;
			if (arguments.length === 1 || !this.multiselect) addSelection = false;

			if (!addSelection) this.unselect();
			if (!itm.selected) {
				$('#itm_'+ w2utils.escapeId(id)).addClass('w2ui-selected');
				itm.selected = true;
			}
			return itm.selected;
		},

		unselect: function (id) {
			var i = 0;
			if (arguments.length === 0) {
				for (; i < this.items.length; i++) doUnselect(this.items[i]);
			} else {
				for (; i < arguments.length; i++) doUnselect(this.get(arguments[i]));
			}
			return true;

			function doUnselect(itm) {
				if (itm !== null && itm.selected) {
					$('#itm_'+ w2utils.escapeId(itm.id)).removeClass('w2ui-selected');
					itm.selected = false;
				}
			}
		},

		getFocused: function (returnIndex) {
			var rslt = this.get(this.curFocused, returnIndex);
			if (rslt === null) rslt = this.get(this.selStart, returnIndex);
			return rslt;
		},

		scrollIntoView: function (id) {
			if (typeof id !== 'undefined') {
				var itm = this.get(id);
				if (itm === null) return;
				var $box	= $(this.box);
				var node	= $('#itm_'+ w2utils.escapeId(id));
				var offset	= node.offset().top - $box.offset().top;
				var nodeHeight = w2utils.getSize(node, 'height');
				if (offset + nodeHeight > $box.height()) {
					$box.scrollTop($box.scrollTop() + offset + nodeHeight - $box.height());
				}
				if (offset <= 0) {
					$box.scrollTop($box.scrollTop() + offset);
				}
			}
		},

		userSelect: function (id, event, isMouse) {
			var itm = null;

			// update selection
			if (event.shiftKey) {
				this.unselect();
				var fIdx = this.get(this.selStart, true);
				if (fIdx !== null) {
					var idx = this.get(id, true);
					var toIdx = Math.max(idx, fIdx);
					for (var i = Math.min(idx, fIdx); i <= toIdx; i++) {
						this.select(this.items[i].id, true);
					}
				} else {
					this.select(id, true);
					this.selStart = id;
				}
			} else if (event.ctrlKey) {
				if (isMouse) {
					itm = this.get(id);
					if (itm.selected) this.unselect(id); else this.select(id, true);
					this.selStart = id;
				}
			} else {
				this.select(id, false);
				this.selStart = id;
			}

			// update focus
			if (itm === null) itm = this.get(id);
			if (itm === null) return;
			var oldItm = this.getFocused();
			if (oldItm !== null) {
				$('#itm_'+ w2utils.escapeId(oldItm.id)).removeClass('w2ui-focused');
			}
			$('#itm_'+ w2utils.escapeId(id)).addClass('w2ui-focused');
			this.curFocused = id;

			// update view
			this.scrollIntoView(id);
		},

		// ===================================================
		// -- Internal Event Handlers

		click: function (id, event) {
			var idx = this.get(id, true);
			if (idx === null) return false;
			var eventData = this.trigger({ phase: 'before', type: 'click', target: id, originalEvent: event, object: this.items[idx] });
			var rslt = eventData.isCancelled !== true;
			if (rslt) {
				// default action
				this.userSelect(id, event, true);
				// event after
				this.trigger($.extend(eventData, { phase: 'after' }));
			}
			return rslt;
		},

		dblClick: function (id, event) {
			var itm = this.get(id);
			if (itm === null) return false;
			var eventData = this.trigger({ phase: 'before', type: 'dblClick', target: id, originalEvent: event, object: itm });
			var rslt = eventData.isCancelled !== true;
			if (rslt) {
				// default action
				// -- empty
				// event after
				this.trigger($.extend(eventData, { phase: 'after' }));
			}
			return rslt;
		},

		keydown: function (event) {
			var obj = this;
			var idx = this.getFocused(true);
			if (idx === null || obj.keyboard !== true) return false;
			var eventData = obj.trigger({ phase: 'before', type: 'keydown', target: obj.name, originalEvent: event });
			var rslt = eventData.isCancelled !== true;
			if (rslt) {
				// default behaviour
				if (event.keyCode == 13) obj.dblClick(obj.items[idx].id, event);
				if (event.keyCode == 32) obj.click(obj.items[idx].id, event);
				if (event.keyCode == 33) processNeighbor('pgUp');
				if (event.keyCode == 34) processNeighbor('pgDown');
				if (event.keyCode == 37) processNeighbor('left');
				if (event.keyCode == 39) processNeighbor('right');
				if (event.keyCode == 38) processNeighbor('up');
				if (event.keyCode == 40) processNeighbor('down');
				// cancel event if needed
				if ($.inArray(event.keyCode, [13, 32, 33, 34, 37, 38, 39, 40]) != -1) {
					if (event.preventDefault) event.preventDefault();
					if (event.stopPropagation) event.stopPropagation();
				}

				// event after
				obj.trigger($.extend(eventData, { phase: 'after' }));
			}
			return rslt;

			function processNeighbor(neighbor) {
				var newIdx = idx;
				var colsCnt = colsCount();
				if (neighbor === 'up') newIdx = idx - colsCnt;
				if (neighbor === 'down') newIdx = idx + colsCnt;
				if (neighbor === 'left' && colsCnt > 1) newIdx = idx - 1;
				if (neighbor === 'right' && colsCnt > 1) newIdx = idx + 1;
				if (newIdx >= 0 && newIdx < obj.items.length && newIdx != idx) {
					obj.userSelect(obj.items[newIdx].id, event, false);
				}
			}

			function colsCount() {
				var lv = $(obj.box).find('> ul');
				return parseInt(lv.width() / w2utils.getSize(lv.find('> li').get(0), 'width'), 10);
			}
		},

		contextMenu: function (id, event) {
			var obj = this;
			var itm = this.get(id);
			if (itm === null) return false;
			if (!itm.selected) obj.select(id);
			var eventData = obj.trigger({ phase: 'before', type: 'contextMenu', target: id, originalEvent: event, object: itm });
			var rslt = eventData.isCancelled !== true;
			if (rslt) {
				// default action
				if (obj.menu.length > 0) {
					$('#itm_'+ w2utils.escapeId(id))
						.w2menu(obj.menu, {
							left: (event ? event.offsetX || event.pageX : 50) - 25,
							select: function (item, event, index) { obj.menuClick(id, index, event); }
						});
				}
				// event after
				obj.trigger($.extend(eventData, { phase: 'after' }));
			}
			return false;
		},

		menuClick: function (itemId, index, event) {
			// event before
			var eventData = this.trigger({ phase: 'before', type: 'menuClick', target: itemId, originalEvent: event, menuIndex: index, menuItem: this.menu[index] });
			var rslt = eventData.isCancelled !== true;
			if (rslt) {
				// default action
				// -- empty
				// event after
				this.trigger($.extend(eventData, { phase: 'after' }));
			}
			return rslt;
		},

		refresh: function (id) {
			var obj = this;
			var time = (new Date()).getTime();

			var idx;
			if (typeof id !== 'undefined') {
				idx = this.get(id, true);
				if (idx === null) return false;
			}

			// event before
			var eventData = this.trigger({ phase: 'before', type: 'refresh', target: (typeof id !== 'undefined' ? id : this.name), object: this.items[idx] });
			if (eventData.isCancelled === true) return false;	

			// default action
			if (typeof id === 'undefined') {
				// refresh all items
				var itms = document.createDocumentFragment();
				for (var i = 0; i < this.items.length; i++) 
					itms.appendChild(getItemElement(this.items[i]));
				var lst = this.lastItm.parentNode;
				while (lst.firstChild !== this.lastItm)
					lst.removeChild(lst.firstChild);
				this.lastItm.parentNode.insertBefore(itms, this.lastItm);
			} else {
				// refresh single item
				var itm = document.getElementById('itm_'+ w2utils.escapeId(id));
				if (itm) {
					// update existing
					itm.parentNode.replaceChild(getItemElement(this.items[idx]), itm);
				} else {
					// create new
					var nextItm;
					if (idx != this.items.length-1)
						nextItm = document.getElementById('itm_'+ w2utils.escapeId(this.items[idx+1].id));
					if (!nextItm) nextItm = this.lastItm;
					nextItm.parentNode.insertBefore(getItemElement(this.items[idx]), nextItm);
				}
			}

			// event after
			this.trigger($.extend(eventData, { phase: 'after' }));

			return (new Date()).getTime() - time;

			function getItemElement(item) {
				var imgClass = (item.icon !== null && typeof item.icon !== 'undefined') ? ' '+item.icon : ' icon-none';
				if (item.img !== null && typeof item.img !== 'undefined') imgClass = ' w2ui-icon '+item.img;

				var withDescription = (typeof item.description !== undefined && item.description !== '');
				var withExtra = (obj.extraCols.length > 0);
				var rslt = getItemTemplate(withDescription, withExtra);
				rslt.id = 'itm_' + item.id;
				rslt.setAttribute('item_id', item.id);
				var itmDiv = rslt.querySelector('div');
				itmDiv.querySelector('div.w2ui-listview-img').className = 'w2ui-listview-img'+imgClass;
				itmDiv.querySelector('div.caption').textContent = item.caption;
				if (withDescription)
					itmDiv.querySelector('div.description').textContent = item.description;
				if (withExtra) {
					var itmExtra = itmDiv.querySelector('div.extra div');
					for (var i = 0; i < obj.extraCols.length; i++) {
						var colName = obj.extraCols[i].name;
						if (colName in item)
							itmExtra.querySelector('div.'+colName).textContent = item[colName];
					}
				}
				return rslt;
			}

			function getItemTemplate(withDescription, withExtra) {
				var template, itmDiv;
				if (!withDescription && !withExtra) {
					if ('captionOnlyTemplate' in obj) {
						template = obj.captionOnlyTemplate;
					} else {
						template = document.createElement('li');
						template.setAttribute('onclick', 'w2ui[\''+obj.name+'\'].click(this.getAttribute(\'item_id\'), event);');
						template.setAttribute('ondblclick', 'w2ui[\''+obj.name+'\'].dblClick(this.getAttribute(\'item_id\'), event);');
						template.setAttribute('oncontextmenu', 'w2ui[\''+obj.name+'\'].contextMenu(this.getAttribute(\'item_id\'), event); if (event.preventDefault) event.preventDefault();');
						itmDiv = appendDiv(template);
						appendDiv(itmDiv, 'w2ui-listview-img');
						appendDiv(itmDiv, 'caption');
						obj.captionOnlyTemplate = template;
					}

				} else
				if (withDescription && !withExtra) {
					if ('captionWithDescription' in obj) {
						template = obj.captionWithDescriptionTemplate;
					} else {
						template = getItemTemplate(false, false);
						itmDiv = template.querySelector('div');
						appendDiv(itmDiv, 'description');
						obj.captionWithDescriptionTemplate = template;
					}
				} else
				if (!withDescription && withExtra) {
					if ('captionWithExtra' in obj) {
						template = obj.captionWithExtra;
					} else {
						template = appendExtra(getItemTemplate(false, false));
						obj.captionWithExtra = template;
					}
				} else
				if (withDescription && withExtra) {
					if ('captionWithDescriptionAndExtra' in obj) {
						template = obj.captionWithDescriptionAndExtra;
					} else {
						template = appendExtra(getItemTemplate(true, false));
						obj.captionWithDescriptionAndExtra = template;
					}
				}
				return template.cloneNode(true);

				function appendExtra(node) {
					var itmDiv = node.querySelector('div');
					var extra = appendDiv(itmDiv, 'extra');
					extra.style.width = extraColsWidth() + 'px';
					extra = appendDiv(extra);
					for (var i = 0; i < obj.extraCols.length; i++) {
						var col = obj.extraCols[i];
						var extraCol = appendDiv(extra, col.name);
						extraCol.style.width = col.width+'px';
						if ('align' in col) extraCol.style.textAlign = col.align;
						if ('paddingLeft' in col) extraCol.style.paddingLeft = col.paddingLeft+'px';
						if ('paddingRight' in col) extraCol.style.paddingRight = col.paddingRight+'px';
					}
					return node;

					function extraColsWidth() {
						var rslt = 0;
						for (var i = 0; i < obj.extraCols.length; i++) {
							if (!('width' in obj.extraCols[i])) obj.extraCols[i].width = 100;
							rslt += obj.extraCols[i].width;
						}
						return rslt;
					}
				}
			}

			function appendDiv(parentElement, cls, txt) {
				var div = document.createElement('div');
				if (typeof cls !== 'undefined') div.className = cls;
				if (typeof txt !== 'undefined') div.textContent = txt;
				parentElement.appendChild(div);
				return div;
			}

		},

		render: function (box) {
			var time = (new Date()).getTime();
			// event before
			var eventData = this.trigger({ phase: 'before', type: 'render', target: this.name, box: box });
			if (eventData.isCancelled === true) return false;
			// default action
			if (typeof box !== 'undefined' && box !== null && this.box !== box) {
				if (this.lastItm) {
					while (this.box.hasChildNodes())
						this.box.removeChild(this.box.lastChild);
					$(this.box)
						.removeAttr('name')
						.removeClass('w2ui-reset w2ui-listview w2ui-icon-small w2ui-icon-medium w2ui-icon-large w2ui-icon-tile w2ui-table');
				}
				this.box = box;
			}
			if (!this.box) return false;
			while (this.box.hasChildNodes())
				this.box.removeChild(this.box.lastChild);
			this.box.scrollTop = 0;

			// render all items
			var list = document.createElement('ul');
			var lastItm = document.createElement('li');
			lastItm.className = 'itmlast';
			lastItm.style.display = 'none';
			list.appendChild(lastItm);
			$(this.box)
				.attr('name', this.name)
				.addClass('w2ui-reset w2ui-listview w2ui-' + this.viewType())
				.append(list);
			this.lastItm = lastItm;
			this.refresh();
			// event after
			this.trigger($.extend(eventData, { phase: 'after' }));
			return (new Date()).getTime() - time;
		},

		destroy: function () {
			// event before
			var eventData = this.trigger({ phase: 'before', type: 'destroy', target: this.name });
			if (eventData.isCancelled === true) return false;
			// clean up
			if (this.box) {
				this.lastItm = null;
				$(this.box)
					.empty()
					.removeAttr('name')
					.removeClass('w2ui-reset w2ui-listview w2ui-icon-small w2ui-icon-medium w2ui-icon-large w2ui-icon-tile w2ui-table');
			}
			delete w2ui[this.name];
			// event after
			this.trigger($.extend(eventData, { phase: 'after' }));
			return true;
		}
	};

	$.extend(w2listview.prototype, w2utils.event);
	w2obj.listview = w2listview;
})();
