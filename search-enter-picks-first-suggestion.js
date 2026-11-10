/*!
 * Routiz / Brikk location search: Enter picks the top Google suggestion, like Google Maps.
 * https://github.com/sipaan/routiz-search-enter-fix (MIT)
 *
 * Enter in Routiz's location search (input[name="rz_geo"], Google Places Autocomplete) picks
 * the suggestion highlighted with the arrow keys, else the top one, waiting for suggestions
 * when Enter came early, and searches once Routiz has stored the place's area (rz_geo_n).
 * Text Google has no suggestion for is searched as typed.
 */
(function () {
	var FIELD = 'input[name="rz_geo"]';
	var BUTTON = '.rz-search-submit button[type="submit"], .rz-button-accent.rz-action-filter';
	var busy = false;

	function hasSuggestions() {
		return Array.prototype.some.call(document.querySelectorAll('.pac-container'), function (box) {
			return box.querySelector('.pac-item') && getComputedStyle(box).display !== 'none';
		});
	}

	function scope(field) {
		return field.closest('form') || field.closest('.rz-search-form, .rz-explore, .elementor-widget') || document;
	}

	function area(field) {
		var north = scope(field).querySelector('[name="rz_geo_n"]');
		return north ? north.value : '';
	}

	// Calls done(true) once test() is true, or done(false) after ms milliseconds.
	function waitFor(test, ms, done) {
		var waited = 0;
		var timer = setInterval(function () {
			waited += 100;
			if (test() || waited >= ms) {
				clearInterval(timer);
				done(test());
			}
		}, 100);
	}

	function search(field) {
		busy = false;
		var button = scope(field).querySelector(BUTTON) || document.querySelector(BUTTON);
		if (button) {
			button.click();
		} else if (field.form) {
			field.form.submit();
		}
	}

	function key(field, name, code) {
		field.dispatchEvent(new KeyboardEvent('keydown', { key: name, keyCode: code, which: code, bubbles: true, cancelable: true }));
	}

	// Google picks the highlighted suggestion on Enter; the field's own listener then keeps
	// that Enter from other Enter handlers further up (e.g. the one in Brikk's footer.php).
	function pick(field) {
		var before = area(field);
		if (!document.querySelector('.pac-item-selected')) {
			key(field, 'ArrowDown', 40);
		}
		field.addEventListener('keydown', function (event) {
			event.stopPropagation();
		}, { once: true });
		key(field, 'Enter', 13);
		waitFor(function () {
			return area(field) !== before;
		}, 1500, function () {
			search(field);
		});
	}

	window.addEventListener('keydown', function (event) {
		var field = event.target;
		if (event.key !== 'Enter' || !event.isTrusted || !field.matches || !field.matches(FIELD)) {
			return;
		}
		// Neither Google nor other handlers get the real key: Google gets its own Enter in pick().
		event.preventDefault();
		event.stopPropagation();
		if (busy || !field.value.trim()) {
			return;
		}
		busy = true;
		waitFor(hasSuggestions, 2500, function (found) {
			if (found) {
				pick(field);
			} else {
				search(field);
			}
		});
	}, true);
})();
