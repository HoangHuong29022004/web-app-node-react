const ratingService = require('../services/ratingService');
const Product = require('../models/Product');

class RatingController {
    // Hiển thị danh sách đánh giá
    async index(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 10;
            const skip = (page - 1) * limit;
            
            const { ratings, totalCount } = await ratingService.getAllRatings(limit, skip);
            const totalPages = Math.ceil(totalCount / limit);
            
            res.render('pages/ratings/index', {
                title: 'Quản lý đánh giá sản phẩm',
                ratings,
                currentPage: page,
                totalPages,
                totalCount
            });
        } catch (error) {
            console.error('Lỗi khi tải danh sách đánh giá:', error);
            req.flash('error', 'Có lỗi xảy ra khi tải danh sách đánh giá');
            res.redirect('/dashboard');
        }
    }
    
    // Cập nhật trạng thái đánh giá
    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { isActive } = req.body;
            
            await ratingService.updateRatingStatus(id, isActive);
            
            res.json({
                success: true,
                message: 'Cập nhật trạng thái thành công'
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Có lỗi xảy ra khi cập nhật trạng thái'
            });
        }
    }
    
    // Hien thi danh gia theo san pham
    async showProductRatings(req, res, next) {
        try {
            const productId = req.params.productId;
            const product = await Product.findById(productId);
            
            if (!product) {
                req.flash('error', 'Không tìm thấy sản phẩm');
                return res.redirect('/ratings');
            }
            
            const ratings = await ratingService.getRatingsByProductId(productId);
            
            res.render('pages/ratings/product-ratings', {
                title: `Đánh giá cho sản phẩm: ${product.name}`,
                product,
                ratings,
                messages: req.flash()
            });
        } catch (error) {
            console.error('Lỗi khi tải đánh giá sản phẩm:', error);
            req.flash('error', 'Có lỗi xảy ra khi tải đánh giá sản phẩm');
            res.redirect('/ratings');
        }
    }
    
    // Xoa danh gia
    async deleteRating(req, res) {
        try {
            const { productId, ratingId } = req.params;
            
            await ratingService.deleteRating(productId, ratingId);
            
            req.flash('success', 'Xóa đánh giá thành công');
            
            // Kiem tra co phai la trang chi tiet san pham khong
            if (req.query.returnTo === 'product') {
                return res.redirect(`/ratings/product/${productId}`);
            }
            
            res.redirect('/ratings');
        } catch (error) {
            console.error('Lỗi khi xóa đánh giá:', error);
            req.flash('error', 'Có lỗi xảy ra khi xóa đánh giá');
            res.redirect('/ratings');
        }
    }
    
    // AJAX xoa danh gia
    async deleteRatingAjax(req, res) {
        try {
            const { productId, ratingId } = req.params;
            
            await ratingService.deleteRating(productId, ratingId);
            
            res.json({
                success: true,
                message: 'Xóa đánh giá thành công'
            });
        } catch (error) {
            console.error('Lỗi khi xóa đánh giá:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Có lỗi xảy ra khi xóa đánh giá'
            });
        }
    }
    
    // Them danh gia mau
    async addSampleRatings(req, res) {
        try {
            await ratingService.addSampleRatings();
            
            req.flash('success', 'Đã thêm đánh giá mẫu thành công');
            res.redirect('/ratings');
        } catch (error) {
            console.error('Lỗi khi thêm đánh giá mẫu:', error);
            req.flash('error', error.message || 'Có lỗi xảy ra khi thêm đánh giá mẫu');
            res.redirect('/ratings');
        }
    }
}

module.exports = new RatingController(); 