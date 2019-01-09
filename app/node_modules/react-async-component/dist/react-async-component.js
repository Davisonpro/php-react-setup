'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var React = require('react');
var React__default = _interopDefault(React);
var PropTypes = _interopDefault(require('prop-types'));

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var defineProperty = function (obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};

var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};

var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var createAsyncContext = (function () {
  var idPointer = 0;
  var registry = {};
  var errors = {};
  return {
    getNextId: function getNextId() {
      idPointer += 1;
      return idPointer;
    },
    resolved: function resolved(id) {
      registry[id] = true;
    },
    failed: function failed(id, error) {
      errors[id] = error;
    },
    getState: function getState() {
      return {
        resolved: Object.keys(registry).reduce(function (acc, cur) {
          return Object.assign(acc, defineProperty({}, cur, true));
        }, {}),
        errors: errors
      };
    }
  };
});

var AsyncComponentProvider = function (_Component) {
  inherits(AsyncComponentProvider, _Component);

  function AsyncComponentProvider() {
    classCallCheck(this, AsyncComponentProvider);
    return possibleConstructorReturn(this, (AsyncComponentProvider.__proto__ || Object.getPrototypeOf(AsyncComponentProvider)).apply(this, arguments));
  }

  createClass(AsyncComponentProvider, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      this.asyncContext = this.props.asyncContext || createAsyncContext();
      this.rehydrateState = this.props.rehydrateState;
    }
  }, {
    key: 'getChildContext',
    value: function getChildContext() {
      var _this2 = this;

      return {
        asyncComponents: {
          getNextId: this.asyncContext.getNextId,
          resolved: this.asyncContext.resolved,
          failed: this.asyncContext.failed,
          shouldRehydrate: function shouldRehydrate(id) {
            var resolved = _this2.rehydrateState.resolved[id];
            delete _this2.rehydrateState.resolved[id];
            return resolved;
          },
          getError: function getError(id) {
            return _this2.rehydrateState.errors && _this2.rehydrateState.errors[id];
          }
        }
      };
    }
  }, {
    key: 'render',
    value: function render() {
      return React__default.Children.only(this.props.children);
    }
  }]);
  return AsyncComponentProvider;
}(React.Component);

AsyncComponentProvider.propTypes = {
  children: PropTypes.node.isRequired,
  asyncContext: PropTypes.shape({
    getNextId: PropTypes.func.isRequired,
    resolved: PropTypes.func.isRequired,
    failed: PropTypes.func.isRequired,
    getState: PropTypes.func.isRequired
  }),
  rehydrateState: PropTypes.shape({
    resolved: PropTypes.object
  })
};
AsyncComponentProvider.defaultProps = {
  asyncContext: undefined,
  rehydrateState: {
    resolved: {}
  }
};
AsyncComponentProvider.childContextTypes = {
  asyncComponents: PropTypes.shape({
    getNextId: PropTypes.func.isRequired,
    resolved: PropTypes.func.isRequired,
    failed: PropTypes.func.isRequired,
    shouldRehydrate: PropTypes.func.isRequired,
    getError: PropTypes.func.isRequired
  }).isRequired
};

var validSSRModes = ['resolve', 'defer', 'boundary'];

function asyncComponent(config) {
  var _class, _temp;

  var name = config.name,
      resolve = config.resolve,
      _config$autoResolveES = config.autoResolveES2015Default,
      autoResolveES2015Default = _config$autoResolveES === undefined ? true : _config$autoResolveES,
      _config$serverMode = config.serverMode,
      serverMode = _config$serverMode === undefined ? 'resolve' : _config$serverMode,
      LoadingComponent = config.LoadingComponent,
      ErrorComponent = config.ErrorComponent;


  if (validSSRModes.indexOf(serverMode) === -1) {
    throw new Error('Invalid serverMode provided to asyncComponent');
  }

  var env = ['node', 'browser'].indexOf(config.env) > -1 ? config.env : typeof window === 'undefined' ? 'node' : 'browser';

  var state = {
    // A unique id we will assign to our async component which is especially
    // useful when rehydrating server side rendered async components.
    id: null,
    // This will be use to hold the resolved module allowing sharing across
    // instances.
    // NOTE: When using React Hot Loader this reference will become null.
    module: null,
    // If an error occurred during a resolution it will be stored here.
    error: null,
    // Allows us to share the resolver promise across instances.
    resolver: null,
    // Indicates whether resolving is taking place
    resolving: false,
    // Handle on the contexts so we don't lose it during async resolution
    asyncComponents: null,
    asyncComponentsAncestor: null
  };

  var needToResolveOnBrowser = function needToResolveOnBrowser() {
    return state.module == null && state.error == null && !state.resolving && typeof window !== 'undefined';
  };

  // Takes the given module and if it has a ".default" the ".default" will
  // be returned. i.e. handy when you could be dealing with es6 imports.
  var es6Resolve = function es6Resolve(x) {
    return autoResolveES2015Default && x != null && (typeof x === 'function' || (typeof x === 'undefined' ? 'undefined' : _typeof(x)) === 'object') && x.default ? x.default : x;
  };

  var getResolver = function getResolver() {
    if (state.resolver == null) {
      state.resolving = true;
      try {
        state.resolver = Promise.resolve(resolve());
      } catch (err) {
        state.resolver = Promise.reject(err);
      }
    }
    return state.resolver;
  };

  return _temp = _class = function (_React$Component) {
    inherits(AsyncComponent, _React$Component);

    function AsyncComponent() {
      classCallCheck(this, AsyncComponent);
      return possibleConstructorReturn(this, (AsyncComponent.__proto__ || Object.getPrototypeOf(AsyncComponent)).apply(this, arguments));
    }

    createClass(AsyncComponent, [{
      key: 'getChildContext',
      value: function getChildContext() {
        return {
          asyncComponentsAncestor: state.asyncComponents == null ? null : {
            isBoundary: serverMode === 'boundary'
          }
        };
      }
    }, {
      key: 'componentWillMount',
      value: function componentWillMount() {
        if (this.context.asyncComponents != null) {
          state.asyncComponents = this.context.asyncComponents;
          state.asyncComponentsAncestor = this.context.asyncComponentsAncestor;
          if (!state.id) {
            state.id = this.context.asyncComponents.getNextId();
          }
        }
      }

      // react-async-bootstrapper

    }, {
      key: 'bootstrap',
      value: function bootstrap() {
        var _this2 = this;

        var doResolve = function doResolve() {
          return _this2.resolveModule().then(function (module) {
            return module === undefined ? false : undefined;
          });
        };

        // browser
        if (env === 'browser') {
          var _state$asyncComponent = state.asyncComponents,
              shouldRehydrate = _state$asyncComponent.shouldRehydrate,
              getError = _state$asyncComponent.getError;

          var error = getError(state.id);
          if (error) {
            state.error = error;
            return false;
          }
          return shouldRehydrate(state.id) ? doResolve() : false;
        }

        // node
        var isChildOfBoundary = state.asyncComponentsAncestor != null && state.asyncComponentsAncestor.isBoundary;

        return serverMode === 'defer' || isChildOfBoundary ? false : doResolve();
      }
    }, {
      key: 'componentDidMount',
      value: function componentDidMount() {
        if (needToResolveOnBrowser()) {
          this.resolveModule();
        }
      }
    }, {
      key: 'resolveModule',
      value: function resolveModule() {
        var _this3 = this;

        return getResolver().then(function (module) {
          if (state.asyncComponents != null) {
            state.asyncComponents.resolved(state.id);
          }
          state.module = module;
          state.error = null;
          state.resolving = false;
          return module;
        }).catch(function (_ref) {
          var message = _ref.message,
              stack = _ref.stack;

          var error = { message: message, stack: stack };
          if (state.asyncComponents != null) {
            state.asyncComponents.failed(state.id, error);
          }
          state.error = error;
          state.resolving = false;
          if (!ErrorComponent) {
            // eslint-disable-next-line no-console
            console.error(error);
          }
        }).then(function (result) {
          if (_this3.unmounted) {
            return undefined;
          }
          if (!_this3.context.reactAsyncBootstrapperRunning && env === 'browser') {
            _this3.forceUpdate();
          }
          return result;
        });
      }
    }, {
      key: 'componentWillUnmount',
      value: function componentWillUnmount() {
        this.unmounted = true;
      }
    }, {
      key: 'render',
      value: function render() {
        var module = state.module,
            error = state.error;


        if (error) {
          return ErrorComponent ? React__default.createElement(ErrorComponent, _extends({}, this.props, { error: error })) : null;
        }

        var Component = es6Resolve(module);
        return Component ? React__default.createElement(Component, this.props) : LoadingComponent ? React__default.createElement(LoadingComponent, this.props) : null;
      }
    }]);
    return AsyncComponent;
  }(React__default.Component), _class.displayName = name || 'AsyncComponent', _class.contextTypes = {
    asyncComponentsAncestor: PropTypes.shape({
      isBoundary: PropTypes.bool
    }),
    asyncComponents: PropTypes.shape({
      getNextId: PropTypes.func.isRequired,
      resolved: PropTypes.func.isRequired,
      shouldRehydrate: PropTypes.func.isRequired
    })
  }, _class.childContextTypes = {
    asyncComponentsAncestor: PropTypes.shape({
      isBoundary: PropTypes.bool
    })
  }, _temp;
}

exports.AsyncComponentProvider = AsyncComponentProvider;
exports.createAsyncContext = createAsyncContext;
exports.asyncComponent = asyncComponent;
//# sourceMappingURL=react-async-component.js.map
