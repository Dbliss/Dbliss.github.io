import { createRouter, createWebHashHistory } from 'vue-router'

import Home from '../pages/Home.vue'
import City from '../pages/City.vue'
import Projects from '../pages/Projects.vue'
import ProjectDetail from '../pages/ProjectDetail.vue'
import About from '../pages/About.vue'
import Contact from '../pages/Contact.vue'
import CityEditor from '../pages/CityEditor.vue'
import Frontier from '../pages/Frontier.vue'

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
