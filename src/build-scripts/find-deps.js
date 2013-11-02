// find dependencies
var
	rjs = require("requirejs"),
	fs = require("fs"),
	path = require("path"),
	extend = require("extend"),
	shared = require("./shared"),
	mapPathInverse = require("./map-path-inverse"),

	LIB_LAZY = "lazy",
	PREFIX_LAZY = LIB_LAZY + "!";


function findDeps(options, config, callback, errback) {
	var entryModule = options.entryModule || config.name, mainConfig;
	
	options = extend(true, {}, options);
	options.baseUrl = config.baseUrl;
	
	mainConfig = loadMainConfig(options, config);
	mapPathInverse.setMainConfig(mainConfig);
	
	config = extend(true, {}, config);
	// deleting these two signals single file optimization
	delete config.appDir;
	delete config.dir;
	// make it explicit that no optimization must be done at this point for faster execution
	config.optimize = "none";
	config.baseUrl = path.normalize(path.join(options.basePath, config.baseUrl));
	// `lazy-registry` is generated, provide the text here
	shared.putLazyRegistryText(config, shared.createModulesRegistryText(null, options, {
		inludeModuleName: false,
		generateBody: false,
		nullBundleDeps: false,
		writeBundleRegistrations: false
	}));
	
	buildAllModules(options, config, entryModule, callback, errback);
}

function loadMainConfig(options, config) {
	var ret = null, mainConfigFileContents;
	if( config && config.mainConfigFile ) {
		if( typeof(options.makeBuildRelativePath) !== "function" ) throw new Error("options should contain a method makeBuildRelativePath()");
		mainConfigFileContents = fs.readFileSync(options.makeBuildRelativePath(config.mainConfigFile), {encoding:"utf8"});
		ret = evalMainConfig();
	}
	return ret;
	
	function evalMainConfig() {
		var realRequire = require, requirejs, originalObject, config;
		originalObject = require = requirejs = {
			config: function(cfg) { config = cfg; } // configuration with the `require.config(...)` or `requirejs.config(...)` case
		};
		eval(mainConfigFileContents);
		if( require !== originalObject ) config = require; // configuration with the `var require = ...` case
		else if( requirejs !== originalObject ) config = requirejs; // configuration with the `var requirejs = ...` case
		require = realRequire;
		return config;
	}
}

function buildAllModules(options, config, entryModule, callback, errback) {
	var modules = {}, modulesToCompile = [];
	
	if( typeof(options.discoverModules) === "function" ) translateModuleNames(options.discoverModules());
	buildModule(entryModule, null);
	
	function buildModule(moduleName, parentModuleName) {
		var originalExcludes = config.exclude, originalIncludes = config.include;
		// do not write anything at this phase
		config.out = function(text) {};
		config.name = moduleName;
		if( parentModuleName == null ) {
			if( config.include == null ) config.include = shared.ROOT_IMPLICIT_DEPS;
			else config.include = config.include.concat(shared.ROOT_IMPLICIT_DEPS);
		}
		rjs.optimize(config, function(buildResponse) {
			config.exclude = originalExcludes;
			config.include = originalIncludes;
			handleBuildResponse(buildResponse, parentModuleName);
			var nextModule = modulesToCompile.shift();
			while( typeof(nextModule) !== "undefined" && modules[nextModule.name] != null ) {
				if( modules[nextModule.name].parents.indexOf(nextModule.parentName) < 0 ) {
					modules[nextModule.name].parents.push(nextModule.parentName);
				}
				nextModule = modulesToCompile.shift();
			}
			if( typeof(nextModule) !== "undefined" ) {
				buildModule(nextModule.name, nextModule.parentName);
			}
			else {
				callback(modules);
			}
		}, function(err) {
			if( typeof(errback) === "function" ) errback("find-deps", err, moduleName);
			else console.log(moduleName + " - " + err);
		});
	}
	
	function handleBuildResponse(buildResponse, parentModuleName) {
		var a = buildResponse.split("\n"),
			storing = false,
			i, moduleName;
		
		for( i = 0; i < a.length; i++ ) {
			if( storing && a[i].trim() !== "" ) {
				if( a[i].indexOf(config.baseUrl) === 0 ) moduleName = a[i].substring(config.baseUrl.length, a[i].length-(".js".length));
				else moduleName = a[i];
				if( moduleName === config.name ) storing = false; // last line in dependencies is the module being compiled, do not add it to deps
				else {
					if( moduleName.indexOf(PREFIX_LAZY) === 0 ) {
						moduleName = moduleName.substring(PREFIX_LAZY.length);
						modulesToCompile.push({
							name: moduleName,
							parentName: config.name
						});
					}
					else modules[config.name].deps.push(mapPathInverse(moduleName));
				}
			}
			else if( a[i].indexOf("-----") === 0 ) {
				storing = true;
				modules[config.name] = {
					parents: parentModuleName != null ? [parentModuleName] : [],
					deps: []
				};
			}
		}
	}
	
	function translateModuleNames(moduleNames) {
		var i;
		for( i=0; i < moduleNames.length; i++ ) {
			modulesToCompile.push({
				name: moduleNames[i],
				parentName: entryModule
			});
		}
	}
}


module.exports = findDeps;
