/**
 * 全局状态 - 仅保留必要的共享状态
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => {
  const currentUser = ref(null)
  const loggedIn = ref(false)

  function setUser(user) {
    currentUser.value = user
    loggedIn.value = !!user
  }

  function clearUser() {
    currentUser.value = null
    loggedIn.value = false
  }

  return { currentUser, loggedIn, setUser, clearUser }
})
