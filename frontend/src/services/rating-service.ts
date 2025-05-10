import { request, authRequest, ApiResponse } from './api-client';

// Interface cho đánh giá
export interface Rating {
    _id: string;
    product: string;
    user: {
        _id: string;
        name: string;
        avatar?: string;
    };
    rating: number;
    comment: string;
    isActive: boolean;
    createdAt: string;
}

// Interface cho response của API
export interface RatingListData {
    ratings: Rating[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
}

export interface RatingResponse {
    success: boolean;
    data: RatingListData;
    message?: string;
    error?: string;
}

// Interface cho response của API khi tạo/cập nhật đánh giá
export interface SingleRatingResponse {
    success: boolean;
    data: Rating;
    message?: string;
    error?: string;
}

// Interface cho request tạo/cập nhật đánh giá
export interface RatingRequest {
    rating: number;
    comment: string;
}

// Interface cho response kiểm tra có thể đánh giá
export interface CanReviewResponse {
    canReview: boolean;
    message: string;
}

class RatingService {
    // Lấy danh sách đánh giá của sản phẩm
    async getProductRatings(productId: string, page: number = 1, limit: number = 10): Promise<ApiResponse<RatingListData>> {
        console.log(`Lấy đánh giá cho sản phẩm: ${productId}, trang: ${page}, limit: ${limit}`);
        try {
            const response = await request<RatingListData>(`products/${productId}/ratings?page=${page}&limit=${limit}`);
            console.log('Kết quả lấy đánh giá:', response);
            return response;
        } catch (error) {
            console.error('Lỗi lấy đánh giá:', error);
            return {
                success: false,
                message: 'Lỗi khi lấy đánh giá sản phẩm'
            };
        }
    }

    // Tạo đánh giá mới
    async createRating(productId: string, data: RatingRequest): Promise<ApiResponse<Rating>> {
        console.log(`Tạo đánh giá cho sản phẩm: ${productId}`, data);
        try {
            const response = await authRequest<Rating>(`products/${productId}/ratings`, 'POST', data);
            console.log('Kết quả tạo đánh giá:', response);
            return response;
        } catch (error) {
            console.error('Lỗi tạo đánh giá:', error);
            return {
                success: false,
                message: 'Lỗi khi tạo đánh giá sản phẩm'
            };
        }
    }

    // Cập nhật đánh giá
    async updateRating(ratingId: string, data: RatingRequest): Promise<ApiResponse<Rating>> {
        return authRequest<Rating>(`ratings/${ratingId}`, 'PUT', data);
    }

    // Xóa đánh giá
    async deleteRating(ratingId: string): Promise<ApiResponse<{message: string}>> {
        return authRequest<{message: string}>(`ratings/${ratingId}`, 'DELETE');
    }
    
    // Kiểm tra người dùng có thể đánh giá sản phẩm không
    async checkCanReview(productId: string): Promise<ApiResponse<CanReviewResponse>> {
        console.log(`Kiểm tra quyền đánh giá cho sản phẩm: ${productId}`);
        try {
            const response = await authRequest<CanReviewResponse>(`products/${productId}/can-review`);
            console.log('Kết quả kiểm tra quyền đánh giá:', response);
            return response;
        } catch (error) {
            console.error('Lỗi kiểm tra quyền đánh giá:', error);
            return {
                success: false,
                message: 'Lỗi khi kiểm tra quyền đánh giá sản phẩm'
            };
        }
    }
}

export default new RatingService(); 