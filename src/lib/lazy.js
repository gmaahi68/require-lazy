define(['module'], function (module) {


	// TODO depends on jQuery for the Deferred functionality, this should be redesigned with an adapter interface
	var
		LazyStub,
		bundleRegistry = {}, moduleRegistry = {},
		NOT_LOADED=0, LOADING=1, LOADED=2;
	
	LazyStub = function(name, parentRequire, bundleDeps, hash, metadata) {
		this.name = name;
		this.parentRequire = parentRequire;
		this.bundleDeps = bundleDeps;
		this.hash = hash;
		this.metadata = metadata;
	};
	
	LazyStub.prototype = {
		name: null,
		parentRequire: null,
		realModule: null,
		bundleDeps: null,
		hash: null,
		metadata: null,
		deferred: null,
		
		get: function() {
			if( this.realModule === null ) {
				var self= this;
				self.deferred = jQuery.Deferred();
				if( typeof(self.bundleDeps) === "undefined" ) { // non-build mode
					self.parentRequire([self.name], function success(m) {
						self.parentRequire = null;
						self.realModule = m;
						self.deferred.resolve(m);
					}, function error(err) {
						self.deferred.reject(err);
					});
				}
				else { // build mode
					doBundleLoad.call(self);
				}
			}
			return this.deferred.promise(); // NOTE: promise() is cheap, so no problem calling it every time
		}
	};
	
	function doBundleLoad() { // called in the context of the LazyStub
		var bundlesToLoad = [], bundleUrlsToLoad = [], bundlesToLoadDeferred = jQuery.Deferred(), whenPromises = [], bundle, url, i, self = this;
		
		for( i=0; i < this.bundleDeps.length; i++ ) {
			bundle = bundleRegistry[this.bundleDeps[i]];
			if( bundle == null ) throw "Unknown bundle: " + this.bundleDeps[i] + " requested by: " + this.name;
			if( bundle.status === NOT_LOADED ) loadBundle(this.bundleDeps[i],bundle,this.parentRequire);
			else if( bundle.status === LOADING ) whenPromises.push(bundle.deferred);
		}
		
//		url = this.parentRequire.toUrl(removePluginsFromName(this.name)) + "-built.js?v=" + this.hash;
		url = baseUrl + "/" + removePluginsFromName(this.name) + "-built.js?v=" + this.hash; // XXX depends on global
		bundleUrlsToLoad.push(url);
		whenPromises.push(bundlesToLoadDeferred.promise());
		
		LazyLoad.js(bundleUrlsToLoad, function() {
			for( var i=0; i < bundlesToLoad.length; i++ ) {
				bundlesToLoad[i].status = LOADED;
				bundlesToLoad[i].deferred.resolve();
				bundlesToLoad[i].deferred = null;
			}
			bundlesToLoadDeferred.resolve();
		});
		
		jQuery.when.apply(jQuery, whenPromises).done(function() {
			self.parentRequire([self.name], function(m) {
				self.parentRequire = null;
				self.realModule = m;
				self.deferred.resolve(m);
			});
		});
		
		
		function loadBundle(bundleId, bundle, parentRequire) {
			bundlesToLoad.push(bundle);
			bundle.status = LOADING;
			bundle.deferred = jQuery.Deferred();
			bundleUrlsToLoad.push(makeBundleUrl(bundleId,bundle,parentRequire));
		}
		
		function makeBundleUrl(bundleId, bundle, parentRequire) {
//			return parentRequire.toUrl("bundles/" + bundleId + ".js?v=" + bundle.hash);
			return baseUrl + "/bundles/" + bundleId + ".js?v=" + bundle.hash; // XXX depends on global
		}
		
		function removePluginsFromName(moduleName) {
			var index = moduleName.lastIndexOf("!");
			if( index >= 0 ) moduleName = moduleName.substr(index+1);
			return moduleName;
		}
	}
	
	
	function registerBundle(bundleId, hash) {
		bundleRegistry[bundleId] = {
			hash: hash,
			deferred: null,
			status: NOT_LOADED
		};
	}
	
	function registerModule(moduleStub) {
		moduleRegistry[moduleStub.name] = {
			module: moduleStub,
			status: NOT_LOADED
		}
	}
	
	function getModule(name) {
		return moduleRegistry[name].module;
	}
	
	
	return {
		Stub: LazyStub,
		load: function(name, parentRequire, onload, config) {
			onload(new LazyStub(name, parentRequire));
		},
		pluginBuilder: "lib/lazy-builder",
		registerBundle: registerBundle,
		registerModule: registerModule,
		getModule: getModule
	};


});