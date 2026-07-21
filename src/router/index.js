import { createRouter, createWebHashHistory } from 'vue-router'

// Keep the small landing page in the entry bundle so its hero renders immediately.
// Every other page is loaded only when visited; several of them include large 3D,
// game, chart, or case-study dependencies that should not delay first paint.
import Home from '../pages/Home.vue'

const City = () => import('../pages/City.vue')
const Projects = () => import('../pages/Projects.vue')
const ProjectDetail = () => import('../pages/ProjectDetail.vue')
const About = () => import('../pages/About.vue')
const Contact = () => import('../pages/Contact.vue')
const CityEditor = () => import('../pages/CityEditor.vue')
const Frontier = () => import('../pages/Frontier.vue')

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
      meta: { hideNav: true, hideFooter: true, fullBleed: true, navReveal: false }
    },
    {
      path: '/city',
      name: 'city',
      component: City,
      meta: { hideNav: true, hideFooter: true, fullBleed: true }
    },
    {
      path: '/city-editor',
      name: 'city-editor',
      component: CityEditor,
      meta: { hideNav: true, hideFooter: true, fullBleed: true, navReveal: false }
    },
    {
      path: '/frontier',
      name: 'frontier',
      component: Frontier,
      meta: { hideNav: true, hideFooter: true, fullBleed: true, navReveal: false }
    },
    { path: '/projects', name: 'projects', component: Projects },
    { path: '/projects/:slug', name: 'project', component: ProjectDetail, props: true },
    { path: '/about', name: 'about', component: About },
    { path: '/contact', name: 'contact', component: Contact },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' }
  }
})

export default router
