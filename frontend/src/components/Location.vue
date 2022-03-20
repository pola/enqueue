<template>
  <span v-if="type === 'PURE'">
    {{ locationLabel }}
  </span>

  <span v-else-if="type === 'LINK'">
    <a :href="locationLink" target="_blank">{{ locationLabel }}</a>
  </span>
</template>

<script>
export default {
  name: 'Location',

  props: {
    location: {
      type: [Object, String],
      default: undefined,
    },
  },

  data: () => ({
    locationLabel: null,
    type: 'PURE',
  }),

  watch: {
    location: function () {
      this.handleLocation()
    },
  },

  created() {
    this.handleLocation()
  },

  methods: {
    handleLocation() {
      if (typeof this.location === 'string') {
        if (/^https:\/\/kth-se\.zoom\.us\//.test(this.location)) {
          this.type = 'LINK'
          this.locationLabel = 'kth-zoom/' + this.location.substring(23)
          this.locationLink = this.location
        } else {
          this.type = 'PURE'
          this.locationLabel = this.location
        }
      } else {
        this.type = 'PURE'
        this.locationLabel = this.location.name
      }
    },
  },
}
</script>
