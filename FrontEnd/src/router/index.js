import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores'

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/Login.vue'),
        meta: { requiresAuth: false }
    },
    {
        path: '/',
        name: 'Dashboard',
        component: () => import('@/views/project/Projects.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/project',
        name: 'ProjectDetail',
        component: () => import('@/views/project/ProjectDetail.vue'),
        meta: { requiresAuth: true },
        redirect: '/project/text-source',
        children: [
            {
                path: 'text-source',
                name: 'ProjectTextSource',
                component: () => import('@/views/textSource/index.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: 'text-source/:id',
                name: 'NovelDetail',
                component: () => import('@/views/textSource/novelDetail/index.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: 'script-structure',
                name: 'ProjectScriptStructure',
                component: () => import('@/views/scriptStructure/ScriptStructure.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: 'character-modeling',
                name: 'ProjectCharacterModeling',
                component: () => import('@/views/characterModeling/CharacterModeling.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: 'audio-video',
                name: 'ProjectAudioVideo',
                component: () => import('@/views/audioVideo/AudioVideo.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: 'project-config',
                name: 'ProjectConfig',
                component: () => import('@/views/projectConfig/ProjectConfig.vue'),
                meta: { requiresAuth: true }
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
    const userStore = useUserStore()

    if (to.meta.requiresAuth && !userStore.isLogin) {
        next('/login')
    } else if (to.path === '/login' && userStore.isLogin) {
        next('/')
    } else {
        next()
    }
})

export default router

