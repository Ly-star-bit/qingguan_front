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
    airResponse.data.forEach(policy => {
      if (policy.v3 && policy.v4 === 'allow') {
        const routes = parseRoutePermissions(policy.v3);
        airPermissions.push(...routes);
      }
    });

    // 解析海运权限
    const seaPermissions: RoutePermission[] = [];
    seaResponse.data.forEach(policy => {
      if (policy.v3 && policy.v4 === 'allow') {
        const routes = parseRoutePermissions(policy.v3);
        seaPermissions.push(...routes);
      }
    });

    return {
      air: airPermissions,
      sea: seaPermissions
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
