const mongoose = require('mongoose');
const Rating = require('../../models/Rating');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const ratingService = require('../../services/ratingService');

// Lấy danh sách đánh giá của sản phẩm
const getProductRatings = async (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const skip = (page - 1) * limit;

        const ratings = await Rating.find({ product: productId, isActive: true })
            .populate('user', 'name avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalCount = await Rating.countDocuments({ product: productId, isActive: true });

        res.json({
            success: true,
            data: {
                ratings,
                totalCount,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách đánh giá',
            error: error.message
        });
    }
};

// Kiểm tra người dùng đã mua sản phẩm chưa
const checkUserPurchased = async (userId, productId) => {
    try {
        console.log(`Kiểm tra mua hàng cho userId: ${userId}, productId: ${productId}`);

        // Tìm đơn hàng đã hoàn thành của người dùng có chứa sản phẩm này
        const orders = await Order.find({
            user: userId,
            orderStatus: { $in: ['Đã giao hàng', 'Đang giao hàng', 'Đã xác nhận'] }
        });

        console.log(`Tìm thấy ${orders.length} đơn hàng của người dùng`);

        // Kiểm tra từng đơn hàng xem có chứa sản phẩm không
        let hasPurchased = false;
        for (const order of orders) {
            console.log(`Kiểm tra đơn hàng: ${order._id}`);
            // Kiểm tra các sản phẩm trong đơn hàng
            for (const item of order.items) {
                console.log(`So sánh sản phẩm: ${item.product} với ${productId}`);
                // So sánh chuỗi để đảm bảo so sánh chính xác
                if (item.product.toString() === productId.toString()) {
                    hasPurchased = true;
                    console.log('Đã tìm thấy sản phẩm trong đơn hàng');
                    break;
                }
            }
            if (hasPurchased) break;
        }

        console.log(`Kết quả kiểm tra mua hàng: ${hasPurchased}`);
        return hasPurchased;
    } catch (error) {
        console.error('Lỗi kiểm tra mua hàng:', error);
        return false;
    }
};

// Tạo đánh giá mới
const createRating = async (req, res) => {
    try {
        const { productId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user._id;

        // Kiểm tra sản phẩm tồn tại
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }

        // Kiểm tra người dùng đã đánh giá chưa
        const existingRating = await Rating.findOne({ product: productId, user: userId });
        if (existingRating) {
            return res.status(400).json({
                success: false,
                message: 'Bạn đã đánh giá sản phẩm này rồi'
            });
        }

        // Bỏ qua kiểm tra người dùng đã mua sản phẩm chưa (tạm thời để test)
        /*
        // Kiểm tra người dùng đã mua sản phẩm chưa
        const hasPurchased = await checkUserPurchased(userId, productId);
        if (!hasPurchased) {
            return res.status(403).json({
                success: false,
                message: 'Bạn cần mua sản phẩm trước khi đánh giá'
            });
        }
        */

        // Tạo đánh giá mới
        const newRating = new Rating({
            product: productId,
            user: userId,
            rating,
            comment
        });

        await newRating.save();

        // Cập nhật điểm đánh giá trung bình của sản phẩm
        const allRatings = await Rating.find({ product: productId, isActive: true });
        const avgRating = allRatings.reduce((sum, item) => sum + item.rating, 0) / allRatings.length;

        product.averageRating = avgRating;
        await product.save();

        res.status(201).json({
            success: true,
            data: newRating
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo đánh giá',
            error: error.message
        });
    }
};

// Cập nhật đánh giá
const updateRating = async (req, res) => {
    try {
        const { ratingId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user._id;

        const existingRating = await Rating.findById(ratingId);
        if (!existingRating) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đánh giá'
            });
        }

        // Kiểm tra quyền sở hữu
        if (existingRating.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền cập nhật đánh giá này'
            });
        }

        existingRating.rating = rating;
        existingRating.comment = comment;
        await existingRating.save();

        // Cập nhật điểm đánh giá trung bình của sản phẩm
        const productId = existingRating.product;
        const allRatings = await Rating.find({ product: productId, isActive: true });
        const avgRating = allRatings.reduce((sum, item) => sum + item.rating, 0) / allRatings.length;

        const product = await Product.findById(productId);
        if (product) {
            product.averageRating = avgRating;
            await product.save();
        }

        res.json({
            success: true,
            data: existingRating
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật đánh giá',
            error: error.message
        });
    }
};

// Xóa đánh giá
const deleteRating = async (req, res) => {
    try {
        const { ratingId } = req.params;
        const userId = req.user._id;

        const rating = await Rating.findById(ratingId);
        if (!rating) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đánh giá'
            });
        }

        // Kiểm tra quyền sở hữu
        if (rating.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xóa đánh giá này'
            });
        }

        const productId = rating.product;
        await rating.remove();

        // Cập nhật điểm đánh giá trung bình của sản phẩm
        const allRatings = await Rating.find({ product: productId, isActive: true });

        if (allRatings.length > 0) {
            const avgRating = allRatings.reduce((sum, item) => sum + item.rating, 0) / allRatings.length;
            const product = await Product.findById(productId);
            if (product) {
                product.averageRating = avgRating;
                await product.save();
            }
        }

        res.json({
            success: true,
            message: 'Xóa đánh giá thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa đánh giá',
            error: error.message
        });
    }
};

// Kiểm tra người dùng đã mua sản phẩm chưa để được phép đánh giá
const checkCanReview = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user._id;

        // Kiểm tra người dùng đã đánh giá chưa
        const existingRating = await Rating.findOne({ product: productId, user: userId });
        if (existingRating) {
            return res.json({
                success: true,
                canReview: false,
                message: 'Bạn đã đánh giá sản phẩm này rồi'
            });
        }
        return res.json({
            success: true,
            canReview: true,
            message: 'Bạn có thể đánh giá sản phẩm này'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra quyền đánh giá',
            error: error.message
        });
    }
};

module.exports = {
    getProductRatings,
    createRating,
    updateRating,
    deleteRating,
    checkCanReview
}; 