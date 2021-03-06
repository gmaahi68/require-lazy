require.config({
	baseUrl: "scripts",
	
	paths: {
		"text": "lib/text",
		"lazy": "lib/lazy",
		"lazy-builder": "lib/lazy-builder",
		"promise-adaptor": "lib/promise-adaptor-jquery"
	},
	
	shim: {
		"lib/jqueryui/jquery.ui.core": {
			deps: ["jquery"]
		},
		"lib/jqueryui/jquery.ui.widget": {
			deps: []
		},
		"lib/jqueryui/jquery.ui.button": {
			deps: ["lib/jqueryui/jquery.ui.core", "lib/jqueryui/jquery.ui.widget"]
		},
		"lib/jqueryui/jquery.ui.tabs": {
			deps: ["lib/jqueryui/jquery.ui.core", "lib/jqueryui/jquery.ui.widget"]
		},
		"lib/jqueryui/jquery.ui.datepicker": {
			deps: ["lib/jqueryui/jquery.ui.core"]
		}
	}
});
