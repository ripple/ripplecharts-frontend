'use strict';

module.exports = function(grunt) {

  /**
   * Load required Grunt tasks. These are installed based on the versions listed
   * in `package.json` when you do `npm install` in this directory.
   */

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-conventional-changelog');
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-coffeelint');
  grunt.loadNpmTasks('grunt-recess');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-ng-annotate');
  grunt.loadNpmTasks('grunt-html2js');

  /**
   * Load in our build configuration file.
   */

  var userConfig = require('./build.config.js');
  var env = process.env.NODE_ENV || 'development';
  var deploymentConfig = require('./deployment.environments.json')[env];
  var maintenance = deploymentConfig.maintenance ? 'maintenance.html' : null;

  /**
   * This is the configuration object Grunt uses to give each plugin its
   * instructions.
   */
  var taskConfig = {

    /**
     * We read in our `package.json` file so we can access the package name and
     * version. It's already there, so we don't repeat ourselves here.
     */
    pkg: grunt.file.readJSON('package.json'),

    /**
     * The banner is the comment that is placed at the top of our compiled
     * source files. It is first processed as a Grunt template, where the `<%=`
     * pairs are evaluated based on this very configuration object.
     */
    meta: {
      banner:
        '/**\n' +
        ' * <%= pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        ' * <%= pkg.homepage %>\n' +
        ' *\n' +
        ' * Copyright (c) <%= grunt.template.today("yyyy") %> ' +
        '<%= pkg.author %>\n' +
        ' * Licensed <%= pkg.licenses.type %> <<%= pkg.licenses.url %>> \n' +
        ' */\n'
    },

    /**
     * Creates a changelog on a new version.
     */
    changelog: {
      options: {
        dest: 'CHANGELOG.md',
        template: 'changelog.tpl'
      }
    },

    /**
     * Increments the version number, etc.
     */
    bump: {
      options: {
        files: [
          'package.json',
          'bower.json'
        ],
        commit: false,
        commitMessage: 'chore(release): v%VERSION%',
        commitFiles: [
          'package.json',
          'client/bower.json'
        ],
        createTag: false,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: false,
        pushTo: 'origin'
      }
    },

    /**
     * The directories to delete when `grunt clean` is executed.
     */
    clean: [
      '<%= build_dir %>',
      '<%= compile_dir %>'
    ],

    /**
     * The `copy` task just copies files from A to B. We use it here to copy
     * our project assets (images, fonts, etc.) and javascripts into
     * `build_dir`, and then to copy the assets to `compile_dir`.
     */
    copy: {
      build_app_assets: {
        files: [
          {
            src: ['**'],
            dest: '<%= build_dir %>/assets/',
            cwd: 'src/assets',
            expand: true
          }
        ]
      },
      build_vendor_assets: {
        files: [
          {
            src: ['<%= vendor_files.assets %>'],
            dest: '<%= build_dir %>/assets/',
            cwd: '.',
            expand: true,
            flatten: true
          }
        ]
      },
      build_vendor_fonts: {
        files: [
          {
            src: ['<%= vendor_files.fonts %>'],
            dest: '<%= build_dir %>/fonts',
            cwd: '.',
            expand: true,
            flatten: true
          }
        ]
      },
      build_appjs: {
        files: [
          {
            src: ['<%= app_files.js %>'],
            dest: '<%= build_dir %>/',
            cwd: '.',
            expand: true
          }
        ]
      },
      build_vendorjs: {
        files: [
          {
            src: ['<%= vendor_files.js %>'],
            dest: '<%= build_dir %>/',
            cwd: '.',
            expand: true
          }
        ]
      },
      build_maintenance: {
        files: [
          {
            src: '<%= app_files.maintenance %>',
            dest: '<%= build_dir %>/',
            cwd: '.',
            expand: true,
            flatten: true
          }
        ]
      },
      compile_maintenance: {
        files: [
          {
            src: '<%= app_files.maintenance %>',
            dest: '<%= compile_dir %>/',
            cwd: '.',
            expand: true,
            flatten: true
          }
        ]
      },
      compile_assets: {
        files: [
          {
            src: ['**'],
            dest: '<%= compile_dir %>/assets',
            cwd: '<%= build_dir %>/assets',
            expand: true
          }
        ]
      }
    },

    /**
     * `grunt concat` concatenates multiple source files into a single file.
     */
    concat: {
      /**
       * The `build_css` target concatenates compiled CSS and vendor CSS
       * together.
       */
      build_css: {
        src: [
          '<%= vendor_files.css %>',
          '<%= recess.build.dest %>'
        ],
        dest: '<%= recess.build.dest %>'
      },
      /**
       * The `compile_js` target is the concatenation of our application source
       * code and all specified vendor source code into a single file.
       */
      compile_js: {
        options: {
          banner: '<%= meta.banner %>'
        },
        src: [
          '<%= vendor_files.js %>',
          'module.prefix',
          '<%= build_dir %>/src/**/*.js',
          '<%= html2js.app.dest %>',
          '<%= html2js.common.dest %>',
          'module.suffix'
        ],
        dest: '<%= compile_dir %>/assets/<%= pkg.name %>-<%= pkg.version %>.js'
      }
    },

    /**
     * `grunt coffee` compiles the CoffeeScript sources. To work well with the
     * rest of the build, we have a separate compilation task for sources and
     * specs so they can go to different places. For example, we need the
     * sources to live with the rest of the copied JavaScript so we can include
     * it in the final build, but we don't want to include our specs there.
     */
    coffee: {
      source: {
        options: {
          bare: true
        },
        expand: true,
        cwd: '.',
        src: ['<%= app_files.coffee %>'],
        dest: '<%= build_dir %>',
        ext: '.js'
      }
    },

    /**
     * `ng-min` annotates the sources before minifying. That is, it allows us
     * to code without the array syntax.
     */
    ngAnnotate: {
      compile: {
        files: [
          {
            src: ['<%= app_files.js %>'],
            cwd: '<%= build_dir %>',
            dest: '<%= build_dir %>',
            expand: true
          }
        ]
      }
    },

    /**
     * Minify the sources!
     */
    uglify: {
      compile: {
        options: {
          banner: '<%= meta.banner %>'
        },
        files: {
          '<%= concat.compile_js.dest %>': '<%= concat.compile_js.dest %>'
        }
      }
    },

    /**
     * `recess` handles our LESS compilation and uglification automatically.
     * Only our `main.less` file is included in compilation; all other files
     * must be imported from this file.
     */
    recess: {
      build: {
        src: ['<%= app_files.less %>'],
        dest: '<%= build_dir %>/assets/<%= pkg.name %>-<%= pkg.version %>.css',
        options: {
          compile: true,
          compress: false,
          noUnderscores: false,
          noIDs: false,
          zeroUnits: false
        }
      },
      compile: {
        src: ['<%= recess.build.dest %>'],
        dest: '<%= recess.build.dest %>',
        options: {
          compile: true,
          compress: true,
          noUnderscores: false,
          noIDs: false,
          zeroUnits: false
        }
      }
    },
    /**
     * HTML2JS is a Grunt plugin that takes all of your template files and
     * places them into JavaScript files as strings that are added to
     * AngularJS's template cache. This means that the templates too become
     * part of the initial payload as one JavaScript file. Neat!
     */
    html2js: {
      /**
       * These are the templates from `src/app`.
       */
      app: {
        options: {
          base: 'src/app'
        },
        src: ['<%= app_files.atpl %>'],
        dest: '<%= build_dir %>/templates-app.js'
      },

      /**
       * These are the templates from `src/common`.
       */
      common: {
        options: {
          base: 'src/common'
        },
        src: ['<%= app_files.ctpl %>'],
        dest: '<%= build_dir %>/templates-common.js'
      }
    },

    /**
     * The Karma configurations.
     */
    karma: {
      options: {
        configFile: '<%= build_dir %>/karma-unit.js'
      },
      unit: {
        port: 9101,
        background: true
      },
      continuous: {
        singleRun: true
      }
    },

    /**
     * The `index` task compiles the `index.html` file as a Grunt template. CSS
     * and JS files co-exist here but they get split apart later.
     */
    index: {

      /**
       * During development, we don't want to have wait for compilation,
       * concatenation, minification, etc. So to avoid these steps, we simply
       * add all script files directly to the `<head>` of `index.html`. The
       * `src` property contains the list of included files.
       */
      build: {
        dir: '<%= build_dir %>',
        src: [
          '<%= vendor_files.js %>',
          '<%= build_dir %>/src/**/*.js',
          '<%= build_dir %>/src/**/*.html',
          '<%= html2js.common.dest %>',
          '<%= html2js.app.dest %>',
          '<%= recess.build.dest %>'
        ]
      },

      /**
       * When it is time to have a completely compiled application, we can
       * alter the above to include only a single JavaScript and a single CSS
       * file. Now we're back!
       */
      compile: {
        dir: '<%= compile_dir %>',
        src: [
          '<%= concat.compile_js.dest %>',
          '<%= recess.compile.dest %>'
        ]
      }
    },

    embed: {
      build: {
        dir: '<%= build_dir %>/embed/',
        src: ['src/embed/**/*.config.js']
      },

      compile: {
        dir: '<%= compile_dir %>/embed/',
        src: ['src/embed/**/*.config.js']
      },

      build_css: {
        dir: '<%= build_dir %>/embed/',
        src: ['src/embed/**/*.config.js']
      },

      compile_css: {
        dir: '<%= compile_dir %>/embed/',
        src: ['src/embed/**/*.config.js']
      }
    },


    /**
     * This task compiles the karma template so that changes to its file array
     * don't have to be managed manually.
     */
    karmaconfig: {
      unit: {
        dir: '<%= build_dir %>',
        src: [
          '<%= vendor_files.js %>',
          '<%= html2js.app.dest %>',
          '<%= html2js.common.dest %>',
          '<%= test_files.js %>'
        ]
      }
    },

    /**
     * And for rapid development, we have a watch set up that checks to see if
     * any of the files listed below change, and then to execute the listed
     * tasks when they do. This just saves us from having to type 'grunt' into
     * the command-line every time we want to see what we're working on; we can
     * instead just leave 'grunt watch' running in a background terminal. Set it
     * and forget it, as Ron Popeil used to tell us.
     *
     * But we don't need the same thing to happen for all the files.
     */
    delta: {
      /**
       * By default, we want the Live Reload to work for all tasks; this is
       * overridden in some tasks (like this file) where browser resources are
       * unaffected. It runs by default on port 35729, which your browser
       * plugin should auto-detect.
       */
      options: {
        livereload: true
      },

      /**
       * When the Gruntfile changes, we just want to lint it. In fact, when
       * your Gruntfile changes, it will automatically be reloaded!
       */
      gruntfile: {
        files: 'Gruntfile.js',
        tasks: [],
        options: {
          livereload: false
        }
      },

      /**
       * When our JavaScript source files change, we want to run lint them and
       * run our unit tests.
       */
      jssrc: {
        files: [
          '<%= app_files.js %>',
          'deps/*.js'
        ],
        tasks: [
          'karma:unit:run',
          'copy:build_appjs',
          'copy:build_vendorjs',
          'embed:build'
        ]
      },

      embed: {
        files: ['src/embed/**/*.js', 'src/embed/**/*.html'],
        tasks: ['embed:build']
      },

      /**
       * When our CoffeeScript source files change, we want to run lint them and
       * run our unit tests.
       */
      coffeesrc: {
        files: [
          '<%= app_files.coffee %>'
        ],
        tasks: ['coffee:source', 'karma:unit:run', 'copy:build_appjs']
      },

      /**
       * When assets are changed, copy them. Note that this will *not* copy new
       * files, so this is probably not very useful.
       */
      assets: {
        files: [
          'src/assets/**/*'
        ],
        tasks: ['copy:build_app_assets']
      },

      /**
       * When index.html changes, we need to compile it.
       */
      html: {
        files: ['<%= app_files.html %>'],
        tasks: ['index:build']
      },

      /**
       * When our templates change, we only rewrite the template cache.
       */
      tpls: {
        files: [
          '<%= app_files.atpl %>',
          '<%= app_files.ctpl %>'
        ],
        tasks: ['html2js']
      },

      /**
       * When the CSS files change, we need to compile and minify them.
       */
      less: {
        files: ['src/**/*.less', '!src/embed/**/*.less'],
        tasks: ['recess:build', 'concat:build_css']
      },

      embed_less: {
        files: ['src/embed/**/*.less'],
        tasks: ['embed:build_css']
      },

      /**
       * When a JavaScript unit test file changes, we only want to lint it and
       * run the unit tests. We don't want to do any live reloading.
       */
      jsunit: {
        files: [
          '<%= app_files.jsunit %>'
        ],
        tasks: ['karma:unit:run'],
        options: {
          livereload: false
        }
      },

      /**
       * When a CoffeeScript unit test file changes, we only want to lint it and
       * run the unit tests. We don't want to do any live reloading.
       */
      coffeeunit: {
        files: [
          '<%= app_files.coffeeunit %>'
        ],
        tasks: ['karma:unit:run'],
        options: {
          livereload: false
        }
      }
    }
  };

  grunt.initConfig(grunt.util._.extend(taskConfig, userConfig));

  /**
   * Deployment Tasks
   */
  grunt.registerTask('deploy', ['default', 's3', 'cloudflare']);

  /**
   * In order to make it safe to just compile or copy *only* what was changed,
   * we need to ensure we are starting from a clean, fresh build. So we rename
   * the `watch` task to `delta` (that's why the configuration var above is
   * `delta`) and then add a new task called `watch` that does a clean build
   * before watching for changes.
   */
  grunt.renameTask('watch', 'delta');
  grunt.registerTask('watch', ['build', 'delta']);
  grunt.registerTask('watch', ['build', 'karma:unit:start', 'delta']);

  /**
   * The default task is to build and compile.
   */
  grunt.registerTask('default', ['build', 'compile']);

  /**
   * The `build` task gets your app ready to run for development and testing.
   */
  grunt.registerTask('build', [
    'clean', 'html2js', 'coffee', 'recess:build',
    'concat:build_css', 'copy:build_app_assets', 'copy:build_vendor_assets',
    'copy:build_vendor_fonts', 'copy:build_appjs', 'copy:build_vendorjs',
    'copy:build_maintenance', 'index:build', 'embed:build_css',
    'embed:build', 'karmaconfig'
  ]);

  /**
   * The `compile` task gets your app ready for deployment by concatenating and
   * minifying your code.
   */

  grunt.registerTask('compile', [
    'recess:compile', 'copy:compile_assets', 'copy:compile_maintenance',
    'ngAnnotate', 'concat:compile_js', 'uglify',
    'index:compile', 'embed:compile_css', 'embed:compile'
  ]);

  /**
   * filterForJS
   * A utility function to get all app JavaScript sources.
   */

  function filterForJS(files) {
    return files.filter(function(file) {
      return file.match(/\.js$/);
    });
  }

  /**
   * filterForCSS
   * A utility function to get all app CSS sources.
   */

  function filterForCSS(files) {
    return files.filter(function(file) {
      return file.match(/\.css$/);
    });
  }

  /**
   * The index.html template includes the stylesheet and javascript sources
   * based on dynamic names calculated in this Gruntfile. This task assembles
   * the list into variables for the template to use and then runs the
   * compilation.
   */

  grunt.registerMultiTask('index', 'Process index.html template', function() {
    var dirRE = new RegExp('^(' + grunt.config('build_dir') +
                           '|' + grunt.config('compile_dir') + ')\/', 'g');
    var jsFiles = filterForJS(this.filesSrc).map(function(file) {
      return file.replace(dirRE, '');
    });
    var cssFiles = filterForCSS(this.filesSrc).map(function(file) {
      return file.replace(dirRE, '');
    });

    grunt.file.copy('src/index.html', this.data.dir + '/index.html', {
      process: function(contents) {
        return grunt.template.process(contents, {
          data: {
            scripts: jsFiles,
            styles: cssFiles,
            maintenance: maintenance,
            mixpanel: deploymentConfig.mixpanel,
            api: deploymentConfig.api,
            ga_account: deploymentConfig.ga_account,
            ga_id: deploymentConfig.ga_id,
            version: grunt.config('pkg.version')
          }
        });
      }
    });
  });


  grunt.registerMultiTask('embed', 'Process embeds', function() {

    var type = this.target;
    var embed = this.data.dir;

    this.filesSrc.forEach(function(f) {
      var config = require('./' + f);
      var dir = embed + config.name + '/';


      // compile and minify css
      if (type === 'build_css' || type === 'compile_css') {

        grunt.config.set('recess.embed_' + config.name, {
          src: config.files.less,
          dest: dir + 'stylesheet.css',
          options: {
            compile: true,
            compress: type === 'compile_css' ? true : false,
            noUnderscores: false,
            noIDs: false,
            zeroUnits: false
          }});

        grunt.task.run('recess:embed_' + config.name);
        return;

      }

      var jsFiles = [];
      var cssFiles = [];
      var iconFiles = [];
      var commonFiles = [];
      var jsonFiles = ['json.js'];
      var json_string = '';
      var filename;

      if (type === 'build') {

        // copy files to build/embed
        config.files.js.forEach(function(file) {
          var name = file.split('/').pop();
          grunt.log.writeln('copying ' + file + ' to ' + dir + name);
          grunt.file.copy(file, dir + name);
          jsFiles.push(name);
        });

        if (config.files.less && config.files.less.length) {
          cssFiles.push('stylesheet.css');
        }

        if (config.files.loader) {
          filename = config.files.loader.split('/').pop();
          grunt.log.writeln('copying ' + config.files.loader +
                            ' to ' + dir + 'assets/images/' + filename);
          grunt.file.copy(config.files.loader, dir +
                          'assets/images/' + filename);
        }

        if (config.files.common) {
          config.files.common.forEach(function(file) {
            var name = file.split('/').pop();
            grunt.log.writeln('copying ' + file + ' to ' + dir + name);
            grunt.file.copy(file, dir + name);
            commonFiles.push(name);
          });
        }

        // copy icon files to build/embed
        if (config.files.icons) {
          config.files.icons.forEach(function(file) {
            var name = file.split('/').pop();
            grunt.log.writeln('copying ' + file + ' to ' +
                              dir + 'assets/icons/' + name);
            grunt.file.copy(file, dir + 'assets/icons/' + name);
            iconFiles.push(name);
          });
        }

        // copy json files to build/embed
        if (config.files.json) {
          config.files.json.forEach(function(file) {
            var varname = file.name;
            var json = grunt.file.read(file.path, {encoding: null}).toString();
            grunt.log.writeln('creating variable for ' + varname);
            json_string += 'var ' + varname + ' = ' + json + '; ';
          });
          grunt.file.write(dir + 'json.js', json_string);
        }

      } else {

        if (config.files.json) {
          config.files.json.forEach(function(file) {
            var varname = file.name;
            var json = grunt.file.read(file.path, {encoding: null}).toString();
            grunt.log.writeln('creating variable for ' + varname);
            json_string += 'var ' + varname + ' = ' + json + '; ';
          });
          grunt.file.write(dir + 'json.js', json_string);
          config.files.js.push(dir + 'json.js');
        }

        if (config.files.common) {
          config.files.common.forEach(function(file) {
            filename = file.split('/').pop();
            grunt.log.writeln('copying ' + file + ' to ' + dir + filename);
            grunt.file.copy(file, dir + filename);
            commonFiles.push(filename);
          });
        }

        // compile files to bin/embed
        var jsFile = dir + 'script.js';
        var files = {};
        files[jsFile] = jsFile; // for uglify
        jsFiles.push('script.js'); // for index template;

        grunt.config.set('concat.embed_' + config.name, {
          options: {
            banner: '<%= meta.banner %>'
          },
          src: config.files.js,
          dest: jsFile
        });

        grunt.config.set('ngAnnotate.embed_' + config.name, {
          files: [
            {
              src: [jsFile],
              cwd: dir,
              dest: dir,
              expand: true
            }
          ]
        });

        // get loader png
        var loader = config.files.loader ?
            grunt.file.read(config.files.loader, {encoding: null}) : '';
        var banner = '<%= meta.banner %>' +
          'var API="' + deploymentConfig.api + '";' +
          'var DOMAIN="' + deploymentConfig.domain + '";';

        if (config.files.less && config.files.less.length) {
          var css = grunt.file.read(dir + 'stylesheet.css')
            .replace(/\r?\n|\r/g, '');
          banner += 'var ' + config.name.toUpperCase() +
            '_CSS="' + css + '";';
        }

        if (loader) {
          banner += 'var LOADER_PNG="' + loader.toString('base64') + '";';
        }

        // get icons png
        var icons = config.files.icons;
        if (icons) {
          for (var i = 0; i < icons.length; i++) {
            var icon = grunt.file.read(icons[i], {encoding: null});
            filename = icons[i].split('/').pop();
            filename = filename.split('.')[0].toUpperCase();
            banner += 'var ' + filename + '_PNG="' +
              icon.toString('base64') + '";';
          }
        }

        grunt.config.set('uglify.embed_' + config.name, {
          options: {banner: banner},
          files: files
        });

        grunt.task.run('concat:embed_' + config.name);
        grunt.task.run('ngAnnotate:embed_' + config.name);
        grunt.task.run('uglify:embed_' + config.name);
      }


      grunt.file.copy(config.files.html, dir + 'index.html', {
        process: function(contents) {
          return grunt.template.process(contents, {
            data: {
              scripts: jsFiles,
              styles: cssFiles,
              json: jsonFiles,
              common: commonFiles,
              mixpanel: deploymentConfig.mixpanel,
              api: deploymentConfig.api,
              domain: deploymentConfig.domain,
              version: grunt.config('pkg.version')
            }
          });
        }
      });
    });
  });

  /**
   * In order to avoid having to specify manually the files needed for karma to
   * run, we use grunt to manage the list for us. The `karma/*` files are
   * compiled as grunt templates for use by Karma. Yay!
   */

  function runKarmaProcess() {
    var jsFiles = filterForJS(this.filesSrc);
    var params = {
      process: function(contents) {
        var opts = {
          data: {
            scripts: jsFiles
          }
        };

        return grunt.template.process(contents, opts);
      }
    };

    grunt.file.copy('karma/karma-unit.tpl.js',
                    grunt.config('build_dir') + '/karma-unit.js',
                    params);
  }

  grunt.registerMultiTask('karmaconfig',
                          'Process karma config templates',
                          runKarmaProcess);
};
