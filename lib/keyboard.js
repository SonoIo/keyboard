;(function(){

var $ = require('jquery');
var _ = require('underscore');

var keys = {
	'ENTER': 13,
	'ESC': 27,
	'BACKSPACE': 8
}


var Keyboard = module.exports = function() {
	this.accelerators = [];
	this.stack = [];
	this.activeLayer = null;
	this.onKeyDown = _.bind(this.onKeyDown, this);
	$(window).on('keydown', this.onKeyDown);
}

// Aggiunge un layer allo stack
Keyboard.prototype.push = function push(callback, context) {
	if (typeof callback !== 'function') {
		console.err('Cannot pass non function object as callback');
		return;
	}
	this.stack.push({
		fn: callback,
		context: context
	});
	this._update();
}

// Rimuove un layer dallo stack
Keyboard.prototype.pop = function pop(context) {
	if (context) {
		for (var i = this.stack.length - 1; i >= 0; i--) {
			if (this.stack[i].context == context)
				this.stack.splice(i, 1);
		};
	}
	else {
		this.stack.pop();
	}

	this._update();
	return this;
}

// Rimuove un handler specifico
Keyboard.prototype.remove = function remove(handler) {
	_(this.stack).forEach(function (aLayer, anIndex, stack) {
		if (aLayer.fn === handler)
			stack.splice(anIndex);
	});
	this._update();
	return this;
}

// Aggiorna l'activeLayer
Keyboard.prototype._update = function _update() {
	if (this.stack.length > 0)
		this.activeLayer = this.stack[this.stack.length - 1];
	else
		this.activeLayer = null;
}

// Evento della window che intercetta tutti i keypress,
// questo evento viene diretto all'ultimo layer che è 
// considerato quello attivo
Keyboard.prototype.onKeyDown = function onKeyDown(e) {
	// Inietto le costanti
	e.keys = keys;

	// Formato stringa del pulsante premuto
	e.character = String.fromCharCode(e.which);

	// Utilities
	e.isLetter = function() { return /[a-zA-Z0-9-_ ]/.test(e.character); }
	e.isNumber = function() { return /[0-9\.\,]/.test(e.character); }

	// Controlla se esiste un acceleratore per la combinazione corrente
	var anAccelerator;
	var acceleratorFound = false;
	for (var i = this.accelerators.length - 1; i >= 0; i--) {
		anAccelerator = this.accelerators[i];
		if (anAccelerator.accelerator.shiftKey == e.shiftKey
			&& anAccelerator.accelerator.altKey == e.altKey
			&& anAccelerator.accelerator.ctrlKey == e.ctrlKey
			&& anAccelerator.accelerator.metaKey == e.metaKey
			&& anAccelerator.accelerator.which == e.which) {

			if (anAccelerator.context)
				anAccelerator.fn.call(anAccelerator.context, e);
			else
				anAccelerator.fn(e);

			acceleratorFound = true;
		}
	};

	// Chiama il callback solo se non è stato trovato un acceleratore
	if (this.activeLayer && !acceleratorFound) {
		// Se esiste un contesto lo applico alla funzione altrimenti
		// chiamo semplicemente la funzione.
		if (this.activeLayer.context)
			this.activeLayer.fn.call(this.activeLayer.context, e);
		else
			this.activeLayer.fn(e);
	}
}

// Accelleratori che vengono attivati dalla pressione di alcuni comandi
// indipendenti dallo stack
Keyboard.prototype.addAccelerator = function addAccelerator(accelerator, callback, context) {
	if (!accelerator.which || accelerator.which.length == 0) {
		throw new Error('Cannot add an accelerator without a character');
	}

	var defaultAccelerator = {
		shiftKey: false,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		which: null
	}
	_.defaults(accelerator, defaultAccelerator);

	// Converto il carattere in code ASCII
	accelerator.which = accelerator.which.toUpperCase().charCodeAt(0);

	this.accelerators.push({
		accelerator: accelerator,
		fn: callback,
		context: context
	});
}

// Libera le risorse e gli eventi
Keyboard.prototype.destroy = function destroy() {
	$(window).off('keypress', this.onKeypress);
}

// Restituisce una middleware
Keyboard.middleware = function middleware() {
	var newKeyboard = new Keyboard();
	return function (shared, next) {
		shared.keyboard = newKeyboard;
		next();
	}
}


})();