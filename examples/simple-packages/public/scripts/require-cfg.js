require.config({
	baseUrl: "scripts",
	
	paths: {
		"text": "lib/text",
		"lazy": "lib/lazy",
		"lazy-builder": "lib/lazy-builder",
		"promise-adaptor": "lib/promise-adaptor-jquery"
	},
	
	packages: ["app/m1", "app/m2", "app/m3"],
	
	GUARD: null
});
