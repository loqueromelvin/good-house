var keystone = require('keystone');
var request = require('request');
var PostComment = keystone.list('PostComment');

exports = module.exports = function (req, res) {

	var view = new keystone.View(req, res);
	var locals = res.locals;
	console.log('keystone==')
	console.log(view)
	// Set locals
	locals.section = 'blog';
	locals.filters = {
		post: req.params.post,
	};
	locals.data = {
		posts: [],
		bible_books: [],
		bible_chapters: [],
		bible_verses: []
	};

	// Load the current post
	view.on('init', function (next) {
		var q = keystone.list('Post').model.findOne({
			state: 'published',
			slug: locals.filters.post,
		}).populate('author categories');

		q.exec(function (err, result) {
			locals.data.post = result;
			next(err);
		});

		console.log('')
	});

	view.on('init', function(next) {
		var BIBLES_API_KEY = 'Fkut1itkq0SoIdgOdozhT3HsQcWgUMCex2GGHM5e';
		var BIBLE_BASE_URL = 'https://bibles.org/v2/';
		var BOOKS = 'versions/{version}/books.json?include_chapters=true';
		var CHAPTERS = 'books/{version}:{book}/chapters.json';
		var VERSES = 'chapters/{version}:{book}.{chapter}/verses.json?include_marginalia=true'

		var dataArr = {};
		dataArr[BOOKS] = {
			'version':'eng-GNTD',
		};
		dataArr[CHAPTERS] = {
			'version':'',
			'book':''
		};
		dataArr[VERSES] = {
			'version':'',
			'book':'',
			'chapter':''
		};

		 request({
		    uri: 'https://bibles.org/v2/books/eng-GNTD:2Tim/chapters.json',
		    qs: {
		      api_key: '123456',
		      query: 'World of Warcraft: Legion'
		    }
		  })

		var fetchData = function(url, data, type) {
			// $.ajax({
			// 	url: url,
			// 	beforeSend: function(xhr) {
	  //   			xhr.setRequestHeader ("Authorization", "Basic " + btoa(BIBLES_API_KEY + ":X"));
			// 	},
			// 	success: function(result) {
			// 		result = JSON.parse(result);
			// 		if (type === 'book') locals.data.bible_books.push(result)
			// 		else if (type === 'chapter') locals.data.bible_chapters.push(result)
			// 		else if (type === 'verses') locals.data.bible_verses.push(result)

			// 		if (type === 'book' || type === 'chapter') {
			// 			for (var i in result) {
			// 				if (type === 'book') {
			// 					dataUrl = BIBLE_BASE_URL + CHAPTERS;
			// 					data[type] = result[i]["id"];
			// 					type = 'chapter';
			// 					for (var p in data) {
			// 						dataUrl = dataUrl.replace('{'+p+'}', data[p])
			// 					}
			// 					fetchData(dataUrl, data, type)
			// 				} else if (type === 'chapter') {
			// 					dataURL = BIBLE_BASE_URL + VERSES;
			// 					data[type] = result[i]["id"];
			// 					type = 'verses';
			// 					for (var p in data) {
			// 						dataUrl = dataUrl.replace('{'+p+'}', data[p])
			// 					}
			// 					fetchData(dataUrl, data, type)
			// 				}
			// 			}
			// 		}
			// 	},
			// 	error: function(xhr, status, error) {
			// 		console.log(xhr)
			// 		console.log(status)
			// 		console.log(error)
			// 	}
			// });
		}

		var dataUrl = BIBLE_BASE_URL+BOOKS;
		for (var p in dataArr[BOOKS]) {
			dataUrl = dataUrl.replace('{'+p+'}', dataArr[BOOKS][p])
		}

		dataArr[CHAPTERS]["version"] = dataArr[BOOKS]["version"]
		fetchData(dataUrl, dataArr[CHAPTERS], 'chapter');
	});

	// Load other posts
	view.on('init', function (next) {
		console.log('init  api')
		var q = keystone.list('Post').model.find().where('state', 'published').sort('-publishedDate').populate('author').limit('4');

		q.exec(function (err, results) {
			locals.data.posts = results;
			next(err);
		});
	});

    // Create a Comment
    view.on('post', { action: 'comment.create' }, function(next) {

        var newComment = new PostComment.model({
            state: 'published',
            post: locals.data.post.id,
            author: locals.user.id
        });

        var updater = newComment.getUpdateHandler(req);

        updater.process(req.body, {
            fields: 'content',
            flashErrors: true,
            logErrors: true
        }, function(err) {
            if (err) {
                data.validationErrors = err.errors;
            } else {
                req.flash('success', 'Your comment was added.');

                return res.redirect('/blog/post/' + locals.data.post.slug + '#comment-id-' + newComment.id);
            }
            next();
        });

    });

    // Delete a Comment
    view.on('get', { remove: 'comment' }, function(next) {

        if (!req.user) {
            req.flash('error', 'You must be signed in to delete a comment.');
            return next();
        }

        PostComment.model.findOne({
                _id: req.query.comment,
                post: locals.data.post.id
            })
            .exec(function(err, comment) {
                if (err) {
                    if (err.name == 'CastError') {
                        req.flash('error', 'The comment ' + req.query.comment + ' could not be found.');
                        return next();
                    }
                    return res.err(err);
                }

                if (!comment) {
                    req.flash('error', 'The comment ' + req.query.comment + ' could not be found.');
                    return next();
                }
                if (comment.author != req.user.id) {
                    req.flash('error', 'Sorry, you must be the author of a comment to delete it.');
                    return next();
                }
                comment.commentState = 'archived';
                comment.save(function(err) {
                    if (err) return res.err(err);
                    req.flash('success', 'Your comment has been deleted.');
                    return res.redirect('/blog/post/' + locals.data.post.slug);
                });
            });
    });
	// Render the view
	view.render('post');
};
