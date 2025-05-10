const Rating = require('../models/Rating');
const Product = require('../models/Product');

class RatingService {
    // Lấy tất cả đánh giá
    async getAllRatings(limit = 10, skip = 0) {
        try {
            const ratings = await Rating.find()
                .populate('product', 'name images')
                .populate('user', 'name email avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const totalCount = await Rating.countDocuments();

            return {
                ratings,
                totalCount
            };
        } catch (error) {
            throw error;
        }
    }

    // Cập nhật trạng thái đánh giá
    async updateRatingStatus(ratingId, isActive) {
        try {
            const rating = await Rating.findById(ratingId);
            if (!rating) {
                throw new Error('Không tìm thấy đánh giá');
            }

            rating.isActive = isActive;
            await rating.save();

            return rating;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new RatingService(); 