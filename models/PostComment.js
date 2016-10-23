var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * PostComment Model
 * ==================
 */

var PostComment = new keystone.List('PostComment', {
});

PostComment.add({
	text: { type: String, required: true },
	author: { type: Types.Relationship, ref: 'User', many: false}
});

PostComment.relationship({ ref: 'Post', path: 'post_comments' });

PostComment.register();
