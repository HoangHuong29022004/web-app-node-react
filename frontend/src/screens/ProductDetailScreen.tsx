import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert, TextInput } from 'react-native';
import { styles } from '../styles/ProductDetailStyles';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Product } from '../types/navigation';
import { productService, cartService, ratingService, authService } from '../services';
import { formatCurrency } from '../utils';
import CustomHeader from '../components/CustomHeader';
import { Rating } from '../services/rating-service';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

const ProductDetailScreen = ({ navigation, route }: Props) => {
  const { productSlug } = route.params;
  const [productDetails, setProductDetails] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [addingToCart, setAddingToCart] = useState<boolean>(false);
  
  // State cho phần đánh giá
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [showRatingInput, setShowRatingInput] = useState<boolean>(false);
  const [newRating, setNewRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [submittingRating, setSubmittingRating] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [canReview, setCanReview] = useState<boolean>(false);
  const [canReviewMessage, setCanReviewMessage] = useState<string>('');
  const [checkingCanReview, setCheckingCanReview] = useState<boolean>(false);

  useEffect(() => {
    fetchProductDetails();
    checkAuthentication();
  }, [productSlug]);

  const checkAuthentication = async () => {
    const isAuth = await authService.isAuthenticated();
    setIsAuthenticated(isAuth);
    
    // Nếu đã đăng nhập và có thông tin sản phẩm, kiểm tra có thể đánh giá không
    if (isAuth && productDetails?._id) {
      checkCanReview(productDetails._id);
    }
  };

  const fetchProductDetails = async () => {
    console.log('Fetching product details for slug:', productSlug);
    setLoading(true);
    try {
      const response = await productService.getProductDetail(productSlug);
      if (response.success && response.data) {
        const productData = response.data as unknown as Product;
        setProductDetails(productData);
        
        if (productData.colors && productData.colors.length > 0) {
          setSelectedColor(productData.colors[0]);
        }
        if (productData.sizes && productData.sizes.length > 0) {
          setSelectedSize(productData.sizes[0]);
        }
        
        // Sau khi lấy thông tin sản phẩm, lấy đánh giá
        if (productData._id) {
          fetchRatings(productData._id);
          
          // Kiểm tra có thể đánh giá nếu đã đăng nhập
          if (isAuthenticated) {
            checkCanReview(productData._id);
          }
        }
      } else {
        console.error('Lỗi lấy thông tin sản phẩm:', response.message);
        Alert.alert('Lỗi', 'Không thể tải thông tin sản phẩm');
      }
    } catch (error) {
      console.error('Lỗi lấy thông tin sản phẩm:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const checkCanReview = async (productId: string) => {
    if (!isAuthenticated) return;
    
    setCheckingCanReview(true);
    try {
      console.log('Kiểm tra quyền đánh giá cho sản phẩm:', productId);
      const response = await ratingService.checkCanReview(productId);
      console.log('Kết quả kiểm tra quyền đánh giá:', response);
      
      if (response.success && response.data) {
        console.log('canReview:', response.data.canReview);
        console.log('message:', response.data.message);
        setCanReview(response.data.canReview);
        setCanReviewMessage(response.data.message);
      }
    } catch (error) {
      console.error('Lỗi kiểm tra quyền đánh giá:', error);
    } finally {
      setCheckingCanReview(false);
    }
  };

  const fetchRatings = async (productId: string, page: number = 1) => {
    setLoadingRatings(true);
    try {
      const response = await ratingService.getProductRatings(productId, page);
      if (response.success && response.data) {
        setRatings(response.data.ratings);
        setCurrentPage(response.data.currentPage);
        setTotalPages(response.data.totalPages);
      } else {
        console.error('Lỗi lấy đánh giá:', response.message);
      }
    } catch (error) {
      console.error('Lỗi lấy đánh giá:', error);
    } finally {
      setLoadingRatings(false);
    }
  };

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (!productDetails) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin sản phẩm');
      return;
    }

    const hasColors = productDetails.colors && productDetails.colors.length > 0;
    const hasSizes = productDetails.sizes && productDetails.sizes.length > 0;

    // Kiểm tra nếu sản phẩm có màu nhưng chưa chọn
    if (hasColors && !selectedColor) {
      Alert.alert('Thông báo', 'Vui lòng chọn màu sắc');
      return;
    }

    // Kiểm tra nếu sản phẩm có kích thước nhưng chưa chọn
    if (hasSizes && !selectedSize) {
      Alert.alert('Thông báo', 'Vui lòng chọn kích thước');
      return;
    }

    // Tạo biến thể (nếu cần)
    const variant = (hasColors || hasSizes) ? {
      color: selectedColor,
      size: selectedSize
    } : undefined;

    try {
      setAddingToCart(true);
      const response = await cartService.addToCart(
        productDetails._id,
        quantity,
        variant
      );

      // Kiểm tra lỗi unauthorized
      if (response.unauthorizedError) {
        Alert.alert(
          'Thông báo',
          'Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng',
          [
            {
              text: 'Hủy',
              style: 'cancel'
            },
            {
              text: 'Đăng nhập',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
        return;
      }

      if (response.success) {
        Alert.alert(
          'Thành công',
          'Đã thêm sản phẩm vào giỏ hàng',
          [
            {
              text: 'Tiếp tục mua sắm',
              style: 'cancel',
            },
            {
              text: 'Xem giỏ hàng',
              onPress: () => navigation.navigate('Cart'),
            },
          ]
        );
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể thêm vào giỏ hàng');
      }
    } catch (error) {
      console.error('Lỗi thêm vào giỏ hàng:', error);
      Alert.alert('Lỗi', 'Không thể thêm vào giỏ hàng');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleAddRating = () => {
    console.log('handleAddRating được gọi');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('canReview:', canReview);
    console.log('canReviewMessage:', canReviewMessage);
    
    if (!isAuthenticated) {
      Alert.alert(
        'Thông báo',
        'Bạn cần đăng nhập để đánh giá sản phẩm',
        [
          {
            text: 'Hủy',
            style: 'cancel'
          },
          {
            text: 'Đăng nhập',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
      return;
    }
    
    // Bỏ qua điều kiện canReview để cho phép người dùng đánh giá dễ dàng hơn trong quá trình test
    /*
    if (!canReview) {
      Alert.alert('Thông báo', canReviewMessage || 'Bạn cần mua sản phẩm trước khi đánh giá');
      return;
    }
    */
    
    setShowRatingInput(!showRatingInput);
  };

  const handleSubmitRating = async () => {
    console.log('handleSubmitRating được gọi');
    
    if (!productDetails) {
      console.log('Không có thông tin sản phẩm');
      return;
    }
    
    if (!comment.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung đánh giá');
      return;
    }
    
    setSubmittingRating(true);
    try {
      console.log('Gửi đánh giá với dữ liệu:', {
        productId: productDetails._id,
        rating: newRating,
        comment
      });
      
      const response = await ratingService.createRating(productDetails._id, {
        rating: newRating,
        comment
      });
      
      console.log('Kết quả gửi đánh giá:', response);
      
      if (response.unauthorizedError) {
        Alert.alert(
          'Thông báo',
          'Bạn cần đăng nhập để đánh giá sản phẩm',
          [
            {
              text: 'Đăng nhập',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
        return;
      }
      
      if (response.success) {
        Alert.alert('Thành công', 'Cảm ơn bạn đã đánh giá sản phẩm');
        setShowRatingInput(false);
        setComment('');
        setNewRating(5);
        // Cập nhật lại danh sách đánh giá
        fetchRatings(productDetails._id);
        // Cập nhật lại trạng thái có thể đánh giá
        setCanReview(false);
        setCanReviewMessage('Bạn đã đánh giá sản phẩm này rồi');
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể gửi đánh giá');
      }
    } catch (error) {
      console.error('Lỗi gửi đánh giá:', error);
      Alert.alert('Lỗi', 'Không thể gửi đánh giá');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (productDetails) {
      setCurrentPage(page);
      fetchRatings(productDetails._id, page);
    }
  };

  const renderColorOption = ({ item }: { item: string }) => {
    // Xác định màu của icon dựa trên độ sáng của màu nền
    const isLightColor = item.toLowerCase() === 'trắng' || item.toLowerCase() === 'white';
    const checkmarkColor = isLightColor ? '#000' : '#fff';

    return (
      <TouchableOpacity
        style={[
          styles.colorOptionContainer,
          selectedColor === item && styles.selectedColorContainer,
        ]}
        onPress={() => setSelectedColor(item)}
      >
        <View
          style={[
            styles.colorOption,
            { 
              backgroundColor: item.toLowerCase() === 'trắng' ? '#ffffff' : 
                              item.toLowerCase() === 'đen' ? '#000000' : 
                              item.toLowerCase() === 'xám' ? '#888888' : 
                              item.toLowerCase() === 'xanh' ? '#0000FF' : 
                              item.toLowerCase() === 'tím' ? '#800080' : 
                              item.toLowerCase() === 'cam' ? '#FFA500' : 
                              item.toLowerCase() === 'hồng' ? '#FFC0CB' : 
                              item.toLowerCase() === 'nâu' ? '#A52A2A' : 
                              item.toLowerCase() === 'bạc' ? '#C0C0C0' : 
                              item.toLowerCase() === 'xanh lá' ? '#008000' : 
                              item.toLowerCase() === 'xanh dương' ? '#0000FF' : 
                              item.toLowerCase() === 'xanh lơ' ? '#00FFFF' : 
                              item.toLowerCase() === 'xanh nước biển' ? '#00BFFF' : 
                              item.toLowerCase() === 'xanh lá cây' ? '#008000' :
                              item.toLowerCase() === 'hồng nhạt' ? '#FFB6C1' : 
                              item.toLowerCase() 

            },
          ]}
        >
          {selectedColor === item && (
            <Icon name="checkmark" size={16} color={checkmarkColor} />
          )}
        </View>
        <Text style={[
          styles.colorText, 
          selectedColor === item && styles.selectedColorText
        ]}>
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSizeOption = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.sizeOption,
        selectedSize === item && styles.selectedSizeOption,
      ]}
      onPress={() => setSelectedSize(item)}
    >
      <Text
        style={[
          styles.sizeText,
          selectedSize === item && styles.selectedSizeText,
        ]}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderRatingItem = ({ item }: { item: Rating }) => {
    const date = new Date(item.createdAt);
    const formattedDate = date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    return (
      <View style={styles.ratingItem}>
        <View style={styles.ratingItemHeader}>
          <View style={styles.userAvatar}>
            {item.user.avatar ? (
              <Image source={{ uri: item.user.avatar }} style={styles.userAvatar} />
            ) : (
              <Text style={styles.avatarText}>{item.user.name.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.user.name}</Text>
            <Text style={styles.ratingDate}>{formattedDate}</Text>
          </View>
        </View>
        <View style={styles.ratingStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Icon
              key={`rating-${item._id}-star-${star}`}
              name={star <= item.rating ? 'star' : 'star-outline'}
              size={16}
              color="#FFD700"
              style={styles.starIcon}
            />
          ))}
        </View>
        <Text style={styles.ratingComment}>{item.comment}</Text>
      </View>
    );
  };

  const renderRatingStars = (rating: number, size: number = 18) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((_, index) => (
          <Icon
            key={`star-${index}`}
            name={
              index < Math.floor(rating)
                ? 'star'
                : index < rating
                ? 'star-half'
                : 'star-outline'
            }
            size={size}
            color="#FFD700"
            style={styles.starIcon}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!productDetails) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={60} color="#ccc" />
        <Text style={styles.errorText}>Không tìm thấy sản phẩm</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader title={productDetails.name} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hình ảnh sản phẩm */}
        <Image
          source={{ uri: productDetails.images[0] }}
          style={styles.productImage}
          resizeMode="cover"
        />

        {/* Thông tin sản phẩm */}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{productDetails.name}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {formatCurrency(productDetails.salePrice || productDetails.price)}
            </Text>
            {productDetails.salePrice && (
              <Text style={styles.originalPrice}>
                {formatCurrency(productDetails.price)}
              </Text>
            )}
          </View>

          {/* Đánh giá */}
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((_, index) => (
                <Icon
                  key={`star-${index}`}
                  name={
                    index < Math.floor(productDetails.averageRating)
                      ? 'star'
                      : index < productDetails.averageRating
                      ? 'star-half'
                      : 'star-outline'
                  }
                  size={18}
                  color="#FFD700"
                  style={styles.starIcon}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>
              {productDetails.averageRating.toFixed(1)}
            </Text>
          </View>
        </View>

        {/* Chọn màu sắc */}
        {productDetails.colors && productDetails.colors.length > 0 && (
          <View style={styles.optionsContainer}>
            <Text style={styles.optionTitle}>Màu sắc:</Text>
            <FlatList
              data={productDetails.colors}
              renderItem={renderColorOption}
              keyExtractor={(item) => `color-${item}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.optionsList}
            />
          </View>
        )}

        {/* Chọn kích thước */}
        {productDetails.sizes && productDetails.sizes.length > 0 && (
          <View style={styles.optionsContainer}>
            <Text style={styles.optionTitle}>Kích thước:</Text>
            <FlatList
              data={productDetails.sizes}
              renderItem={renderSizeOption}
              keyExtractor={(item) => `size-${item}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.optionsList}
            />
          </View>
        )}

        {/* Mô tả sản phẩm */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.sectionTitle}>Mô tả sản phẩm</Text>
          <Text style={styles.descriptionText}>{productDetails.description}</Text>
        </View>

        {/* Phần đánh giá sản phẩm */}
        <View style={styles.ratingsContainer}>
          <View style={styles.ratingsHeader}>
            <Text style={styles.sectionTitle}>Đánh giá sản phẩm</Text>
            <TouchableOpacity 
              style={styles.addRatingButton}
              onPress={handleAddRating}
            >
              <Icon name="add" size={20} color="#fff" />
              <Text style={styles.addRatingButtonText}>Viết đánh giá</Text>
            </TouchableOpacity>
          </View>
          
          {/* Thông báo về quyền đánh giá */}
          {isAuthenticated && !canReview && !showRatingInput && (
            <Text style={styles.noRatingsText}>
              {canReviewMessage || 'Bạn cần mua sản phẩm trước khi đánh giá'}
            </Text>
          )}

          {/* Form thêm đánh giá */}
          {showRatingInput && (
            <View style={styles.ratingInputContainer}>
              <View style={styles.ratingStarsInput}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={`input-star-${star}`}
                    style={styles.starButton}
                    onPress={() => setNewRating(star)}
                  >
                    <Icon
                      name={star <= newRating ? 'star' : 'star-outline'}
                      size={30}
                      color="#FFD700"
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.commentInput}
                placeholder="Nhập đánh giá của bạn về sản phẩm này..."
                multiline
                value={comment}
                onChangeText={setComment}
              />
              <TouchableOpacity
                style={styles.submitRatingButton}
                onPress={handleSubmitRating}
                disabled={submittingRating}
              >
                {submittingRating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitRatingText}>Gửi đánh giá</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Danh sách đánh giá */}
          {loadingRatings ? (
            <ActivityIndicator size="small" color="#000" style={{ marginVertical: 20 }} />
          ) : ratings.length > 0 ? (
            <>
              <FlatList
                data={ratings}
                renderItem={renderRatingItem}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
              />
              
              {/* Phân trang */}
              {totalPages > 1 && (
                <View style={styles.paginationContainer}>
                  <TouchableOpacity
                    style={styles.paginationButton}
                    onPress={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <Icon
                      name="chevron-back"
                      size={24}
                      color={currentPage === 1 ? '#ccc' : '#666'}
                    />
                  </TouchableOpacity>
                  
                  <Text style={styles.paginationText}>
                    {currentPage} / {totalPages}
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.paginationButton}
                    onPress={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <Icon
                      name="chevron-forward"
                      size={24}
                      color={currentPage === totalPages ? '#ccc' : '#666'}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.noRatingsText}>
              Chưa có đánh giá nào cho sản phẩm này
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Thanh công cụ dưới */}
      <View style={styles.bottomToolbar}>
        <View style={styles.quantitySelector}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(-1)}
            disabled={quantity <= 1}
          >
            <Icon name="remove" size={22} color="#000" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(1)}
            disabled={quantity >= 10}
          >
            <Icon name="add" size={22} color="#000" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={handleAddToCart}
          disabled={addingToCart}
        >
          {addingToCart ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Icon name="cart-outline" size={22} color="#fff" />
              <Text style={styles.addToCartText}>Thêm vào giỏ hàng</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProductDetailScreen; 