import axiosInstance from './axiosInstance';

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8085";

export interface FilterCondition {
  field: string;
  value: string;
  operator: string;
}

export interface CasbinPolicy {
  ptype: string;
  v0: string;
  v1: string;
  v2: string;
  v3: string;
  v4: string;
  v5: string;
}

export interface CasbinResponse {
  total: number;
  skip: number;
  limit: number;
  data: CasbinPolicy[];
}

export interface RoutePermission {
  startland: string;
  destination: string;
}

/**
 * 调用 Casbin 过滤接口获取策略
 */
export const filterPolicies = async (
  filters: FilterCondition[],
  skip: number = 0,
  limit: number = 100
): Promise<CasbinResponse> => {
  const response = await axiosInstance.post(`${server_url}/casbin/policies/filter`, {
    filters,
    skip,
    limit
  });
  return response.data;
};

/**
 * 解析 v3 字段中的 startland 和 destination
 */
export const parseRoutePermissions = (v3: string): RoutePermission[] => {
  try {
    const parsed = JSON.parse(v3);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [parsed];
  } catch (e) {
    console.error('解析权限数据失败:', e);
    return [];
  }
};

/**
 * 获取用户对空运和海运的起运地和目的地权限
 */
export const getUserRoutePermissions = async (username: string): Promise<{
  air: RoutePermission[];
  sea: RoutePermission[];
}> => {
  try {
    // 所有可能的路线组合（当 v3 为空数组时使用）
    const allRoutes: RoutePermission[] = [
      { startland: 'China', destination: 'America' },
      { startland: 'China', destination: 'Canada' },
      { startland: 'China', destination: 'Vietnam' },
      { startland: 'Vietnam', destination: 'America' },
      { startland: 'Vietnam', destination: 'Canada' },
      { startland: 'Vietnam', destination: 'Vietnam' },
    ];

    // 查询空运权限
    const airFilters: FilterCondition[] = [
      { field: "v0", value: username, operator: "eq" },
      { field: "v1", value: "/qingguan/products/", operator: "eq" },
      { field: "v4", value: "allow", operator: "eq" }
    ];
    
    // 查询海运权限
    const seaFilters: FilterCondition[] = [
      { field: "v0", value: username, operator: "eq" },
      { field: "v1", value: "/qingguan/products_sea/", operator: "eq" },
      { field: "v4", value: "allow", operator: "eq" }
    ];

    const [airResponse, seaResponse] = await Promise.all([
      filterPolicies(airFilters),
      filterPolicies(seaFilters)
    ]);

    // 解析空运权限
    const airPermissions: RoutePermission[] = [];
    let hasAirEmptyPermission = false;
    airResponse.data.forEach(policy => {
      // v4 为空或为 'allow' 时才处理
      if (!policy.v4 || policy.v4 === 'allow') {
        if (!policy.v3 || policy.v3.trim() === '' || policy.v3 === '[]') {
          // v3 为空或空数组，表示拥有所有权限
          hasAirEmptyPermission = true;
        } else {
          const routes = parseRoutePermissions(policy.v3);
          if (routes.length === 0) {
            // 如果解析后是空数组，也表示所有权限
            hasAirEmptyPermission = true;
          } else {
            airPermissions.push(...routes);
          }
        }
      }
    });

    // 解析海运权限
    const seaPermissions: RoutePermission[] = [];
    let hasSeaEmptyPermission = false;
    seaResponse.data.forEach(policy => {
      // v4 为空或为 'allow' 时才处理
      if (!policy.v4 || policy.v4 === 'allow') {
        if (!policy.v3 || policy.v3.trim() === '' || policy.v3 === '[]') {
          // v3 为空或空数组，表示拥有所有权限
          hasSeaEmptyPermission = true;
        } else {
          const routes = parseRoutePermissions(policy.v3);
          if (routes.length === 0) {
            // 如果解析后是空数组，也表示所有权限
            hasSeaEmptyPermission = true;
          } else {
            seaPermissions.push(...routes);
          }
        }
      }
    });

    return {
      air: hasAirEmptyPermission ? allRoutes : airPermissions,
      sea: hasSeaEmptyPermission ? allRoutes : seaPermissions
    };
  } catch (error) {
    console.error('获取用户路由权限失败:', error);
    return {
      air: [],
      sea: []
    };
  }
};

/**
 * 从权限列表中提取唯一的起运地
 */
export const getUniqueStartlands = (permissions: RoutePermission[]): string[] => {
  const startlands = permissions.map(p => p.startland);
  return Array.from(new Set(startlands));
};

/**
 * 从权限列表中提取唯一的目的地
 */
export const getUniqueDestinations = (permissions: RoutePermission[]): string[] => {
  const destinations = permissions.map(p => p.destination);
  return Array.from(new Set(destinations));
};

/**
 * 检查用户是否有特定路线的权限
 */
export const hasRoutePermission = (
  permissions: RoutePermission[],
  startland: string,
  destination: string
): boolean => {
  return permissions.some(
    p => p.startland === startland && p.destination === destination
  );
};

/**
 * 获取用户的 convey_type 权限
 * 返回用户可以访问的运输方式列表
 */
export const getUserConveyTypePermissions = async (username: string): Promise<string[]> => {
  try {
    // 所有可能的运输方式（当 v3 为空数组时使用）
    const allConveyTypes = ['空运', '海运', '整柜', '拼箱'];

    // 查询 convey_type 权限
    const filters: FilterCondition[] = [
      { field: "v0", value: username, operator: "eq" },
      { field: "v1", value: "/qingguan/cumstom_clear_history_summary/", operator: "eq" }
    ];

    const response = await filterPolicies(filters);

    // 解析权限
    const conveyTypes: string[] = [];
    let hasEmptyPermission = false;

    response.data.forEach(policy => {
      // v4 为空或为 'allow' 时才处理
      if (!policy.v4 || policy.v4 === 'allow') {
        if (!policy.v3 || policy.v3.trim() === '' || policy.v3 === '[]') {
          // v3 为空或空数组，表示拥有所有权限
          hasEmptyPermission = true;
        } else {
          try {
            const parsed = JSON.parse(policy.v3);
            if (Array.isArray(parsed)) {
              // 处理对象数组 [{convey_type: '空运'}] 或字符串数组 ['空运']
              parsed.forEach(item => {
                if (typeof item === 'object' && item !== null && 'convey_type' in item) {
                  conveyTypes.push(item.convey_type);
                } else if (typeof item === 'string') {
                  conveyTypes.push(item);
                }
              });
            } else if (typeof parsed === 'string') {
              conveyTypes.push(parsed);
            }
          } catch (e) {
            console.error('解析 convey_type 权限失败:', e);
          }
        }
      }
    });

    // 如果有空权限或解析后为空数组，返回所有运输方式
    if (hasEmptyPermission || (response.data.length > 0 && conveyTypes.length === 0)) {
      return allConveyTypes;
    }
    console.log('conveyTypes',conveyTypes)
    // 去重并返回
    return Array.from(new Set(conveyTypes));
  } catch (error) {
    console.error('获取 convey_type 权限失败:', error);
    return [];
  }
};
