## Mithril Boilerplate

This is a quick starter template coupled with NodeJS build tools for projects that want to use Leo Horie's
[Mithril](http://lhorie.github.io/mithril/index.html) framework.

Features include:

+ Gulpfile and modular tasks via [gulp-starter](https://github.com/greypants/gulp-starter)
+ Bower support -- wire dependencies with [wiredep](https://github.com/taptapship/wiredep)
+ Browserify for CommonJS modules (Mithril is installed from NPM)
+ JSHint and JSCS linting
+ LESS support (easily swapped with your preproc of choice)
+ Connect server with LiveReload
+ Proxy middleware for local/external API calls and mocks using [connect-prism](https://github.com/seglo/connect-prism)
+ Connect middleware for HTML5 pushState fallback (for pathname routes)

### Requirements

+ NodeJS and NPM
+ Bower (optional)

### Install and use

`npm install`

`gulp watch`

Now you should see the example Mithril app at [http://localhost:9000](http://localhost:9000)

# Gulp Tasks

- Run `gulp watch` to get local development started.
- Run `gulp build` to build a distribution.
- Run `gulp wiredep` to add new bower dependencies to your index.html.
