import { defineStore } from 'pinia'
import { StudentAPI } from '@/database/api'

interface Student {
  id: number
  name: string
  gender: '男' | '女'
  birthday: string
  student_no?: string
  disorder?: string
  avatar_path?: string
  created_at: string
  updated_at: string
}

export const useStudentStore = defineStore('student', {
  state: () => ({
    students: [] as Student[],
    currentStudent: null as Student | null,
    loading: false,
    searchKeyword: ''
  }),

  getters: {
    // 获取筛选后的学生列表
    filteredStudents: (state) => {
      if (!state.searchKeyword) {
        return state.students
      }
      const keyword = state.searchKeyword.toLowerCase()
      return state.students.filter(student =>
        student.name.toLowerCase().includes(keyword) ||
        student.disorder?.toLowerCase().includes(keyword) ||
        student.student_no?.toLowerCase().includes(keyword)
      )
    },

    // 获取学生总数
    studentCount: (state) => state.students.length,

    // 按性别统计
    genderStats: (state) => {
      const male = state.students.filter(s => s.gender === '男').length
      const female = state.students.filter(s => s.gender === '女').length
      return { male, female }
    },

    // 按障碍类型统计
    disorderStats: (state) => {
      const stats: Record<string, number> = {}
      state.students.forEach(student => {
        if (student.disorder) {
          stats[student.disorder] = (stats[student.disorder] || 0) + 1
        }
      })
      return stats
    }
  },

  actions: {
    // 加载所有学生
    async loadStudents() {
      try {
        this.loading = true
        const api = new StudentAPI()
        this.students = await api.getAllStudents()
      } catch (error) {
        console.error('加载学生列表失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 添加学生
    async addStudent(student: Omit<Student, 'id' | 'created_at' | 'updated_at'>) {
      try {
        this.loading = true
        const api = new StudentAPI()
        const id = await api.addStudent(student)

        // 重新加载列表
        await this.loadStudents()
        return id
      } catch (error) {
        console.error('添加学生失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 更新学生信息
    async updateStudent(id: number, student: Partial<Student>) {
      try {
        this.loading = true
        const api = new StudentAPI()
        const success = await api.updateStudent(id, student)

        if (success) {
          // 更新本地状态
          const index = this.students.findIndex(s => s.id === id)
          if (index !== -1) {
            this.students[index] = { ...this.students[index], ...student }
          }

          // 更新当前学生
          if (this.currentStudent?.id === id) {
            this.currentStudent = { ...this.currentStudent, ...student }
          }
        }

        return success
      } catch (error) {
        console.error('更新学生失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 删除学生
    async deleteStudent(id: number) {
      try {
        this.loading = true
        const api = new StudentAPI()
        const success = await api.deleteStudent(id)

        if (success) {
          // 从本地状态移除
          this.students = this.students.filter(s => s.id !== id)

          // 如果是当前学生，清除
          if (this.currentStudent?.id === id) {
            this.currentStudent = null
          }
        }

        return success
      } catch (error) {
        console.error('删除学生失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 获取学生详情
    async getStudentById(id: number) {
      try {
        const api = new StudentAPI()
        const student = await api.getStudentById(id)

        if (student) {
          this.currentStudent = student
        }

        return student
      } catch (error) {
        console.error('获取学生详情失败:', error)
        throw error
      }
    },

    // 搜索学生
    async searchStudents(keyword: string) {
      try {
        this.searchKeyword = keyword
        // 实际搜索已通过getter实现
      } catch (error) {
        console.error('搜索学生失败:', error)
        throw error
      }
    },

    // 计算年龄
    getAge(birthday: string): number {
      const birth = new Date(birthday)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }

      return age
    },

    // 计算月龄
    getAgeInMonths(birthday: string): number {
      const birth = new Date(birthday)
      const today = new Date()

      let months = (today.getFullYear() - birth.getFullYear()) * 12
      months += today.getMonth() - birth.getMonth()

      if (today.getDate() < birth.getDate()) {
        months--
      }

      return months
    }
  }
})