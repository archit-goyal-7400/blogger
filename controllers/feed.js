const Post = require('../models/post');
const fs = require('fs');
const path = require('path');
const User = require('../models/user');
const io = require('../socket');
exports.getPosts = (req, res, next) => {
    const perPage = 2;
    currentPage = req.query.page || 1;
    let totalItems;
    Post.count()
        .populate('creator')
        .then(count => {
            totalItems = count;
            return Post.find().skip((currentPage - 1) * perPage).limit(perPage);
        })
        .then(posts => {
            res.status(200).json({
                posts: posts,
                totalItems: totalItems
            });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
}

exports.getPost = (req, res, next) => {

    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error('Post not found....');
                error.statusCode = 404;
                throw error;
            }
            res.status(200).json({
                message: "displaying post",
                post: post
            });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
}

exports.createPost = (req, res, next) => {

    const title = req.body.title;
    const content = req.body.content;

    if (!req.file) {
        const err = new Error('Image not found');
        err.statusCode = 422;
        throw (err);
    }
    const imageUrl = req.file.path.replace(/\\/g, "/");

    const post = new Post({
        title: title,
        content: content,
        creator: req.userId,
        imageUrl: imageUrl
    });
    let creator;
    post.save()
        .then(result => {
            return User.findById(req.userId);
        })
        .then(user => {
            creator = user;
            user.post.push(post);
            return user.save();
        })
        .then(result => {

            io.getIo().emit('posts', {
                action: 'create',
                post: {
                    ...post._doc, creator: { _id: req.userId, name: creator.name }
                }
            });
            res.status(201).json({
                message: "post created....",
                post: post,
                creator: {
                    _id: creator._id,
                    name: creator.name
                }
            });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
}

exports.updatePost = (req, res, next) => {
    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;
    if (req.file) {
        imageUrl = req.file.path.replace(/\\/g, "/");
    }
    if (!imageUrl) {
        const err = new Error('Image not found');
        err.statusCode = 422;
        throw (err);
    }
    console.log(imageUrl, 'update');
    Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error('Post not found....');
                error.statusCode = 404;
                throw error;
            }
            if (req.userId !== post.creator.toString()) {
                const err = new Error('Not authorized');
                err.statusCode = 403;
                throw err;
            }
            if (imageUrl != post.imageUrl) {
                clearImage(post.imageUrl);
            }
            post.title = title;
            post.content = content;
            post.imageUrl = imageUrl;
            return post.save();
        })
        .then(result => {
            res.status(200).json({
                message: "Update is successful...",
                post: result
            });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
}

const clearImage = filepath => {
    console.log(filepath);
    filepath = path.join(__dirname, '..', filepath);
    fs.unlink(filepath, err => console.log(err));
}

exports.deletePost = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error('Post not found....');
                error.statusCode = 404;
                throw error;
            }
            if (req.userId !== post.creator.toString()) {
                const err = new Error('Not authorized');
                err.statusCode = 403;
                throw err;
            }
            clearImage(post.imageUrl);
            return Post.findByIdAndRemove(postId);
        })
        .then(result => {
            return User.findById(req.userId);

        })
        .then(user => {
            user.post.pull(postId);
            return user.save();
        })
        .then(result => {
            res.status(200).json({
                message: "deleted"
            });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
}