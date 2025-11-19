import apiInterceptor from './apiInterceptor';

export interface Category {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
}

export interface SubCategory {
  _id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  defaultUnitOfMeasure?: string;
  suggestedMinPrice?: number;
}

interface CategoryHierarchy {
  category: Category;
  subCategories: SubCategory[];
}

class CatalogueService {
  // Get all categories
  async getCategories(): Promise<Category[]> {
    try {
      const response = await apiInterceptor.makeAuthenticatedRequest<{ categories: Category[] }>(
        `/catalogue/categories`,
        { method: 'GET' }
      );

      if (response.success && response.data?.categories) {
        return response.data.categories;
      }

      throw new Error(response.error || 'Failed to fetch categories');
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  // Get a single category by its ID
  async getCategoryById(categoryId: string): Promise<Category> {
    try {
      const categories = await this.getCategories();
      const category = categories.find(c => c._id === categoryId);
      if (!category) {
        throw new Error(`Category with ID ${categoryId} not found`);
      }
      return category;
    } catch (error) {
      console.error('Error fetching category by ID:', error);
      throw error;
    }
  }

  // Get categories by type
  async getCategoriesByType(type: string): Promise<Category[]> {
    try {
      const response = await apiInterceptor.makeAuthenticatedRequest<{ categories: Category[] }>(
        `/catalogue/categories?category=${type}`,
        { method: 'GET' }
      );

      if (response.success && response.data?.categories) {
        return response.data.categories;
      }

      throw new Error(response.error || 'Failed to fetch categories by type');
    } catch (error) {
      console.error('Error fetching categories by type:', error);
      throw error;
    }
  }

  // Get subcategories for a category
  async getSubCategories(categoryId: string): Promise<SubCategory[]> {
    try {
      const response = await apiInterceptor.makeAuthenticatedRequest<{ subcategories: SubCategory[] }>(
        `/catalogue/categories/${categoryId}/children`,
        { method: 'GET' }
      );

      if (response.success && response.data?.subcategories) {
        return response.data.subcategories;
      }

      throw new Error(response.error || 'Failed to fetch subcategories');
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      throw error;
    }
  }

  // Get a single sub-category by its ID
  async getSubCategoryById(subCategoryId: string): Promise<SubCategory> {
    try {
      // Use the category details endpoint to get a specific category
      const response = await apiInterceptor.makeAuthenticatedRequest<{ category: SubCategory }>(
        `/catalogue/categories/${subCategoryId}`,
        { method: 'GET' }
      );

      if (response.success && response.data?.category) {
        return response.data.category;
      }

      throw new Error(response.error || `Sub-category with ID ${subCategoryId} not found`);
    } catch (error) {
      console.error('Error fetching sub-category by ID:', error);
      throw error;
    }
  }

  // Get complete category hierarchy
  async getCategoryHierarchy(): Promise<CategoryHierarchy[]> {
    try {
      // Use the tree endpoint with 'all' to get the complete hierarchy
      const response = await apiInterceptor.makeAuthenticatedRequest<{ tree: any[] }>(
        `/catalogue/categories/all/tree`,
        { method: 'GET' }
      );

      if (!response.success || !response.data?.tree) {
        throw new Error(response.error || 'Failed to fetch category hierarchy');
      }

      // The backend returns { message, rootId, tree }
      // tree is an array of categories with nested children
      // We need to transform it to match the expected CategoryHierarchy format
      const tree = response.data.tree || [];

      // Transform the tree structure to flat hierarchy with subcategories
      const hierarchy: CategoryHierarchy[] = [];

      for (const node of tree) {
        const category: Category = {
          _id: node._id,
          name: node.name,
          slug: node.slug,
          icon: node.icon,
          description: node.description,
        };

        const subCategories: SubCategory[] = (node.children || []).map((child: any) => ({
          _id: child._id,
          categoryId: node._id,
          name: child.name,
          slug: child.slug,
          description: child.description,
          icon: child.icon,
          defaultUnitOfMeasure: child.defaultUnitOfMeasure,
          suggestedMinPrice: child.suggestedMinPrice,
        }));

        hierarchy.push({
          category,
          subCategories,
        });
      }

      return hierarchy;
    } catch (error) {
      console.error('Error fetching category hierarchy:', error);
      throw error;
    }
  }
}

export default new CatalogueService();
